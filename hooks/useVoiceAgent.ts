import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolCall, ToolCallUI, TranscriptMessage, VoiceAgentState } from '@/lib/types';
import { toolDefinitions } from '@/lib/tools';
import { agentConfig } from '@/lib/agent-config';
import { float32ToInt16, int16ToBase64, resampleFloat32, base64ToFloat32 } from '@/utils/audio';

const DEBUG = false; // flip to true to log mic-capture heartbeats + WS events

const SAMPLE_RATE = 24000;
const CHUNK_MS = 50;
const CHUNK_SAMPLES = (SAMPLE_RATE * CHUNK_MS) / 1000; // 1200

interface UseVoiceAgentOptions {
  onTranscript?: (msg: TranscriptMessage) => void;
  onToolCall?: (call: ToolCallUI) => void;
  onStatusChange?: (status: VoiceAgentState['status']) => void;
}

export function useVoiceAgent(options: UseVoiceAgentOptions = {}) {
  const { onStatusChange, onTranscript, onToolCall } = options;
  const [state, setState] = useState<VoiceAgentState>({
    status: 'idle',
    sessionId: null,
    userTranscripts: [],
    agentTranscripts: [],
    toolCalls: [],
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextPlayTimeRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const pendingToolResultsRef = useRef<Map<string, Promise<{
    result: unknown;
    isError: boolean;
    error?: string;
  }>>>(new Map());
  const reconnectTimerRef = useRef<number | null>(null);
  const endTimerRef = useRef<number | null>(null);
  const endingRef = useRef(false);
  const connectRef = useRef<(token: string, resume?: boolean) => Promise<void>>();

  const log = useCallback((...args: unknown[]) => {
    if (DEBUG) console.log('[VoiceTutor]', ...args);
  }, []);

  const setStatus = useCallback((status: VoiceAgentState['status']) => {
    setState((prev) => ({ ...prev, status }));
    onStatusChange?.(status);
  }, [onStatusChange]);

  const addUserTranscript = useCallback((text: string, isFinal: boolean) => {
    const msg: TranscriptMessage = { type: 'transcript.user', text, timestamp: Date.now(), isFinal };
    setState((prev) => {
      const last = prev.userTranscripts[prev.userTranscripts.length - 1];
      // If the previous entry was an in-progress (non-final) partial, replace it
      // in place rather than appending — otherwise every delta piles up as a
      // separate transcript line instead of updating live.
      if (last && !last.isFinal) {
        const userTranscripts = prev.userTranscripts.slice(0, -1).concat(msg);
        return { ...prev, userTranscripts };
      }
      return { ...prev, userTranscripts: [...prev.userTranscripts, msg] };
    });
    onTranscript?.(msg);
  }, [onTranscript]);

  const addAgentTranscript = useCallback((text: string) => {
    const msg: TranscriptMessage = { type: 'transcript.agent', text, timestamp: Date.now(), isFinal: true };
    setState((prev) => ({ ...prev, agentTranscripts: [...prev.agentTranscripts, msg] }));
    onTranscript?.(msg);
  }, [onTranscript]);

  // Additive helper for restoring a previously-saved conversation into the
  // live UI (chat history replay). It is a no-op if the caller passes
  // undefined, so existing consumers are unaffected.
  const setTranscripts = useCallback((
    userTranscripts: TranscriptMessage[],
    agentTranscripts: TranscriptMessage[],
  ) => {
    setState((prev) => ({
      ...prev,
      userTranscripts: userTranscripts ?? prev.userTranscripts,
      agentTranscripts: agentTranscripts ?? prev.agentTranscripts,
    }));
  }, []);

  const addToolCall = useCallback((call: ToolCallUI) => {
    setState((prev) => ({ ...prev, toolCalls: [...prev.toolCalls, call] }));
    onToolCall?.(call);
  }, [onToolCall]);

  const updateToolCallResult = useCallback((callId: string, result: any, status: 'success' | 'error' = 'success') => {
    setState((prev) => ({
      ...prev,
      toolCalls: prev.toolCalls.map((tc) =>
        tc.call_id === callId ? { ...tc, result, status } : tc
      ),
    }));
  }, []);

  // --- Audio Playback ---
  // Schedule each incoming chunk directly on the Web Audio timeline as it
  // arrives, chaining via nextPlayTimeRef. No queue, no waiting for onended —
  // onended fires AFTER the audio has already stopped, which made the
  // `+0.03` lookahead win the Math.max and inserted a gap between chunks.
  const stopAllPlayback = useCallback(() => {
    for (const source of activeSourcesRef.current) {
      try { source.stop(); } catch { /* already ended */ }
    }
    activeSourcesRef.current.clear();
    nextPlayTimeRef.current = 0;
  }, []);

  const playAudioChunk = useCallback(async (base64Data: string) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { /* ignore */ }
    }

    const floatData = base64ToFloat32(base64Data);
    if (floatData.length === 0) return;

    const buffer = ctx.createBuffer(1, floatData.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(floatData);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // If the timeline has already fallen behind real-time, start slightly in
    // the future (30 ms jitter buffer). Otherwise start exactly where the
    // previous chunk ended — seamless chaining, zero gaps.
    const startTime = Math.max(ctx.currentTime + 0.03, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;

    activeSourcesRef.current.add(source);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
    };
  }, []);

  // --- Connect ---
  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ latencyHint: 'interactive' });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const connect = useCallback(async (token: string, resume = false) => {
    // Only short-circuit when there's a genuinely live, usable socket. A socket
    // that is closing or already closed (e.g. right after disconnect) must NOT
    // block a fresh connect — otherwise "Stop then Start" silently does nothing.
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !endingRef.current) return;

    setStatus('connecting');
    setState((prev) => ({ ...prev, error: null }));

    const ws = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      log('WebSocket open, sending session config');
      ws.send(JSON.stringify(resume && sessionIdRef.current
        ? { type: 'session.resume', session_id: sessionIdRef.current }
        : {
          type: 'session.update',
          session: {
            system_prompt: agentConfig.systemPrompt,
            greeting: agentConfig.greeting,
            input: {
              // `audio/pcm` is the documented default encoding for 24 kHz mono
              // PCM16. Do not change it to `audio/pcm16` — that token is not
              // recognized and the server rejects the session.update.
              format: { encoding: 'audio/pcm' },
              keyterms: [
                'Python', 'algorithm', 'function', 'variable', 'loop', 'API',
                'React', 'SQL', 'debugging', 'calculus', 'algebra', 'equation',
                'recursion', 'binary tree', 'sorting', 'data structure',
              ],
              turn_detection: {
                vad_threshold: 0.5,
                min_silence: 300,
                max_silence: 1500,
                interrupt_response: true,
              },
            },
            output: {
              voice: agentConfig.voice,
              format: { encoding: 'audio/pcm' },
            },
            tools: toolDefinitions,
          },
        }));
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type !== 'reply.audio') log('WS recv:', data.type);

      switch (data.type) {
        case 'session.ready':
          sessionIdRef.current = data.session_id;
          setState((prev) => ({ ...prev, sessionId: data.session_id }));
          setStatus('recording');
          break;

        case 'session.ended':
          endingRef.current = true;
          if (endTimerRef.current !== null) {
            window.clearTimeout(endTimerRef.current);
            endTimerRef.current = null;
          }
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.close();
          }
          break;

        case 'transcript.user.delta':
          // Live partial transcript while the student is still speaking.
          addUserTranscript(data.text, false);
          break;

        case 'transcript.user':
          // Final transcript for the student's turn.
          addUserTranscript(data.text, true);
          break;

        case 'transcript.agent':
          addAgentTranscript(data.text);
          break;

        case 'reply.audio':
          if (data.data) playAudioChunk(data.data);
          break;

        case 'reply.done': {
          // Drain every pending tool call. The AssemblyAI protocol expects a
          // `tool.result` for each `tool.call` once `reply.done` fires; dropping
          // them leaves the agent waiting until its tool timeout fires.
          //
          // On interrupt the agent stops speaking but still expects results for
          // any in-flight tool calls, so we send an error envelope instead of
          // silently discarding them — otherwise the session hangs.
          //
          // AWAIT each promise before sending. The previous implementation used
          // `.then()` fire-and-forget with a guard that dropped results whose
          // socket had since closed. That is wrong: a tool still executing when
          // `reply.done` arrives (common — Wikipedia takes 1-2s) resolves after
          // the socket is gone, the guard dropped the result, and the agent
          // hung until its own tool timeout. The agent is literally waiting on
          // us, so we must not send until the result is ready.
          const interrupted = data.status === 'interrupted';
          if (interrupted) stopAllPlayback();

          const entries = Array.from(pendingToolResultsRef.current.entries());
          pendingToolResultsRef.current.clear();
          for (const [callId, resultPromise] of entries) {
            let toolResult: { result: unknown; isError: boolean; error?: string } | null = null;
            try {
              toolResult = await resultPromise;
            } catch {
              toolResult = { result: { error: 'Tool failed' }, isError: true, error: 'Tool failed' };
            }
            const sock = wsRef.current;
            if (!sock || sock.readyState !== WebSocket.OPEN || endingRef.current) return;
            const isError = interrupted || toolResult.isError;
            const envelope = isError
              ? { error: interrupted ? 'Interrupted by user' : (toolResult.error as string) }
              : toolResult.result;
            sock.send(JSON.stringify({
              type: 'tool.result',
              call_id: callId,
              result: JSON.stringify(envelope),
            }));
          }
          break;
        }

        case 'tool.call': {
          const call: ToolCallUI = {
            call_id: data.call_id,
            name: data.name,
            args: data.arguments,
            status: 'pending',
          };
          addToolCall(call);

          const resultPromise = (async (): Promise<{
            result: unknown;
            isError: boolean;
            error?: string;
          }> => {
            // The server already races executeTool against a 5s timeout, but a
            // hung connect or a stalled response body would leave this promise
            // pending forever — and the `reply.done` drain awaits it, so the
            // whole session would hang. Bound the client side too.
            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), 8000);
            try {
              const res = await fetch('/api/tool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: data.name, args: data.arguments }),
                signal: controller.signal,
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error || 'Tool execution failed');
              updateToolCallResult(data.call_id, json.result, 'success');
              return { result: json.result, isError: false };
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : 'Tool failed';
              const result = { error: errorMsg };
              updateToolCallResult(data.call_id, result, 'error');
              return { result, isError: true, error: errorMsg };
            } finally {
              window.clearTimeout(timer);
            }
          })();
          pendingToolResultsRef.current.set(data.call_id, resultPromise);
          break;
        }

        case 'session.error':
        case 'error':
          setState((prev) => ({ ...prev, error: data.message || 'Unknown error' }));
          setStatus('error');
          break;

        default:
          break;
      }
    };

    ws.onclose = (event) => {
      // Gate on the captured socket: if this socket has been replaced (the user
      // stopped and started a new session before the old one closed) or torn
      // down intentionally, ignore the event entirely. Without this guard a
      // stale onclose can fire after a fresh session is open and either
      // schedule a reconnect or stamp an error onto the new session.
      if (wsRef.current !== ws) return;
      setStatus('disconnected');
      wsRef.current = null;
      if (endTimerRef.current !== null) {
        window.clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
      if (!endingRef.current && sessionIdRef.current && event.code !== 1008 && event.code !== 1000) {
        reconnectTimerRef.current = window.setTimeout(async () => {
          try {
            const response = await fetch('/api/token');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Reconnect failed');
            await connectRef.current?.(data.token, true);
          } catch {
            setState((prev) => ({ ...prev, error: 'Connection lost. Please restart the session.' }));
            setStatus('error');
          }
        }, 1000);
      }
      if (event.code === 1008) {
        setState((prev) => ({ ...prev, error: 'Authentication failed. Check your token.' }));
      } else if (event.code !== 1000) {
        setState((prev) => ({ ...prev, error: `Connection closed: ${event.code} - ${event.reason}` }));
      }
    };

    ws.onerror = () => {
      setStatus('error');
      setState((prev) => ({ ...prev, error: 'WebSocket error occurred.' }));
    };
  }, [playAudioChunk, addUserTranscript, addAgentTranscript, addToolCall, updateToolCallResult, setStatus, stopAllPlayback, log]);

  connectRef.current = connect;

  // --- Start Microphone ---
  // Acquire the mic stream. This MUST run while a user gesture is still active:
  // getUserMedia requires transient user activation on desktop Chrome/Firefox,
  // and any `await` that yields the event loop consumes that activation. The
  // previous flow did fetch → await connect → await getUserMedia, so by the
  // time the mic request fired the gesture was gone and desktop browsers
  // threw "NotFoundError" / "No microphone detected" — even though Android
  // Chrome (which is lenient about gesture timing) worked fine. Callers must
  // invoke this synchronously after a user gesture, before any await.
  const acquireMicStream = useCallback(async (): Promise<MediaStream | null> => {
    if (micStreamRef.current) return micStreamRef.current;
    // Create the AudioContext SYNCHRONOUSLY — do not await ensureAudioContext
    // here, because it awaits ctx.resume() which yields the event loop and
    // consumes the user gesture before getUserMedia fires. Setting up the
    // context synchronously keeps the gesture alive for the mic request.
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ latencyHint: 'interactive' });
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      // Fire-and-forget resume: it resolves asynchronously, and getUserMedia
      // is the first await below so the gesture survives.
      ctx.resume();
    }

    // Probe available devices to refine the error message — but do NOT bail
    // out early. enumerateDevices() omits audioinput devices until the user
    // has granted microphone permission, so a missing audioinput here does
    // NOT mean there is no microphone; it means permission hasn't been asked
    // for yet. Calling getUserMedia first is what triggers the permission
    // prompt and makes the device appear. So: always attempt getUserMedia,
    // and only use the probe to pick a clearer error message if it fails.
    let hasAudioInput = true;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      hasAudioInput = devices.some((d) => d.kind === 'audioinput');
    } catch {
      // Enumeration failed (e.g. insecure context) — proceed to the raw
      // attempt and let getUserMedia's own error message guide the user.
    }

    // Try progressively simpler constraints. Some audio drivers reject the
    // processing flags (echoCancellation/autoGainControl/noiseSuppression)
    // entirely, which surfaces as NotFoundError even when a mic is present.
    // Starting from the most permissive constraint and loosening on failure
    // maximizes the chance of getting a stream on the first try.
    const attempts: MediaTrackConstraints[] = [
      { channelCount: 1, echoCancellation: true, autoGainControl: true },
      { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      { channelCount: 1 },
      { channelCount: 1, deviceId: 'default' },
    ];

    let lastError: unknown = null;
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
        micStreamRef.current = stream;
        return stream;
      } catch (err) {
        lastError = err;
        const name = err instanceof DOMException ? err.name : '';
        // NotAllowedError means the user denied permission — loosening the
        // constraint won't help, so stop retrying.
        if (name === 'NotAllowedError') break;
        // NotFoundError/NotReadableError may recover with a simpler constraint,
        // so continue to the next attempt.
      }
    }

    // All attempts failed. Distinguish the failure mode so the user gets
    // actionable guidance instead of a generic message. If enumerateDevices
    // also showed no audioinput, the machine genuinely has no mic; otherwise
    // the failure is a driver/permission issue worth retrying.
    const name = lastError instanceof DOMException ? lastError.name : '';
    const message =
      name === 'NotAllowedError'
        ? 'Microphone permission denied. Allow access in your browser settings, then try again.'
        : !hasAudioInput
          ? 'No microphone detected on this device. Connect a microphone or use a different browser.'
          : name === 'NotFoundError'
            ? 'Could not open the microphone. Try a different browser or restart the app.'
            : name === 'NotReadableError'
              ? 'Your microphone is in use by another application. Close it and try again.'
              : lastError instanceof Error
                ? lastError.message
                : 'Failed to access microphone';
    setState((prev) => ({ ...prev, error: message }));
    setStatus('error');
    return null;
  }, [setStatus]);

  const startMicrophone = useCallback(async () => {
    const stream = await acquireMicStream();
    if (!stream) return;
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(2048, 1, 1);
    processorRef.current = processor;

    let pcmBuffer = new Int16Array(0);
    let captureCount = 0;

    processor.onaudioprocess = (e) => {
      captureCount++;
      if (DEBUG && captureCount % 100 === 0) {
        log('mic capture alive, callbacks:', captureCount);
      }

      const inputData = e.inputBuffer.getChannelData(0);
      const resampled = resampleFloat32(inputData, ctx.sampleRate, SAMPLE_RATE);
      const int16 = float32ToInt16(resampled);

      const newBuffer = new Int16Array(pcmBuffer.length + int16.length);
      newBuffer.set(pcmBuffer);
      newBuffer.set(int16, pcmBuffer.length);
      pcmBuffer = newBuffer;

      while (pcmBuffer.length >= CHUNK_SAMPLES) {
        const chunk = pcmBuffer.slice(0, CHUNK_SAMPLES);
        pcmBuffer = pcmBuffer.slice(CHUNK_SAMPLES);
        const base64 = int16ToBase64(chunk);

        if (wsRef.current?.readyState === WebSocket.OPEN && !endingRef.current) {
          wsRef.current.send(JSON.stringify({ type: 'input.audio', audio: base64 }));
        }
      }
    };

    source.connect(processor);

    // FIX: In Chrome, ScriptProcessorNode.onaudioprocess does NOT fire unless
    // the node is connected downstream to AudioDestinationNode. Route the
    // output through a silent gain node so we satisfy that requirement
    // without playing mic audio back through the speakers (no feedback).
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    processor.connect(silentGain);
    silentGain.connect(ctx.destination);
    silentGainRef.current = silentGain;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    log('microphone started, ctx rate:', ctx.sampleRate, 'state:', ctx.state);
  }, [acquireMicStream, log]);

  // --- Disconnect ---
  const disconnect = useCallback(() => {
    endingRef.current = true;
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const socket = wsRef.current;
    if (socket) {
      if (socket.readyState === WebSocket.OPEN) {
        // Send a clean session.end and wait for the server to close. The
        // onclose handler will null wsRef and clear this timer; if the server
        // doesn't cooperate, force-close after 2s. Null wsRef now so a
        // subsequent startSession doesn't see a stale socket; the local
        // `socket` variable keeps the handle alive for the endTimer.
        socket.send(JSON.stringify({ type: 'session.end' }));
        wsRef.current = null;
        endTimerRef.current = window.setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CLOSING) {
            socket.close();
          }
          endTimerRef.current = null;
        }, 2000);
      } else {
        // Already closing or closed — nothing to send, clear the ref now so a
        // subsequent startSession doesn't see a stale socket.
        wsRef.current = null;
      }
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (silentGainRef.current) {
      silentGainRef.current.disconnect();
      silentGainRef.current = null;
    }
    stopAllPlayback();
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    sessionIdRef.current = null;
    setStatus('idle');
    setState((prev) => ({ ...prev, sessionId: null }));
  }, [setStatus, stopAllPlayback]);

  // --- Initiate session ---
  // `guest` skips the authenticated session check on the token endpoint so
  // unauthenticated judges can reach the tutor without registering. Guest
  // sessions are rate-limited and get a shorter token TTL.
  const startSession = useCallback(async (options: { guest?: boolean } = {}) => {
    endingRef.current = false;
    try {
      // Acquire the mic stream FIRST, while the user gesture that triggered
      // this click is still active. getUserMedia requires transient user
      // activation on desktop Chrome/Firefox, and any `await` below yields
      // the event loop and consumes that activation — which is exactly why
      // the previous order (fetch → connect → getUserMedia) failed on
      // desktop with "No microphone detected" even though Android Chrome
      // (lenient about gesture timing) worked. Do this before awaiting the
      // token so the gesture survives.
      await acquireMicStream();

      const tokenUrl = options.guest ? '/api/token?guest=true' : '/api/token';
      const res = await fetch(tokenUrl);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get token');
      await ensureAudioContext();
      await connect(data.token);
      await startMicrophone();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Startup failed',
      }));
      setStatus('error');
    }
  }, [acquireMicStream, connect, ensureAudioContext, startMicrophone, setStatus]);

  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return {
    state,
    startSession,
    disconnect,
    setTranscripts,
    isRecording: state.status === 'recording',
    isConnected: state.status === 'connected' || state.status === 'recording',
  };
}