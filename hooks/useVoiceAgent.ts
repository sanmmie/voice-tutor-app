import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolCall, ToolCallUI, TranscriptMessage, VoiceAgentState } from '@/lib/types';
import { toolDefinitions } from '@/lib/tools';
import { agentConfig } from '@/lib/agent-config';
import { float32ToInt16, int16ToBase64, resampleFloat32 } from '@/utils/audio';

const DEBUG = true; // flip to true to log mic-capture heartbeats + WS events

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
  const pendingToolResultsRef = useRef<Map<string, Promise<{ result: unknown; isError: boolean }>>>(new Map());
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
    setState((prev) => ({ ...prev, userTranscripts: [...prev.userTranscripts, msg] }));
    onTranscript?.(msg);
  }, [onTranscript]);

  const addAgentTranscript = useCallback((text: string) => {
    const msg: TranscriptMessage = { type: 'transcript.agent', text, timestamp: Date.now(), isFinal: true };
    setState((prev) => ({ ...prev, agentTranscripts: [...prev.agentTranscripts, msg] }));
    onTranscript?.(msg);
  }, [onTranscript]);

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
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

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
      log('WS recv:', data.type);

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

        case 'transcript.user':
          addUserTranscript(data.text, data.is_final || false);
          break;

        case 'transcript.agent':
          addAgentTranscript(data.text);
          break;

        case 'reply.audio':
          if (data.data) playAudioChunk(data.data);
          break;

        case 'reply.done':
          if (data.status === 'interrupted') {
            stopAllPlayback();
            pendingToolResultsRef.current.clear();
          } else {
            const entries = Array.from(pendingToolResultsRef.current.entries());
            pendingToolResultsRef.current.clear();
            for (const [callId, resultPromise] of entries) {
              resultPromise.then((toolResult) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'tool.result',
                    call_id: callId,
                    result: JSON.stringify(toolResult.result),
                    is_error: toolResult.isError,
                  }));
                }
              });
            }
          }
          break;

        case 'tool.call': {
          const call: ToolCallUI = {
            call_id: data.call_id,
            name: data.name,
            args: data.arguments,
            status: 'pending',
          };
          addToolCall(call);

          const resultPromise = (async () => {
            try {
              const res = await fetch('/api/tool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: data.name, args: data.arguments }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error || 'Tool execution failed');
              updateToolCallResult(data.call_id, json.result, 'success');
              return { result: json.result, isError: false };
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : 'Tool failed';
              const result = { error: errorMsg };
              updateToolCallResult(data.call_id, result, 'error');
              return { result, isError: true };
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
      setStatus('disconnected');
      wsRef.current = null;
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
  const startMicrophone = useCallback(async () => {
    if (audioContextRef.current && micStreamRef.current) return;

    try {
      const ctx = await ensureAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

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
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to access microphone',
      }));
      setStatus('error');
    }
  }, [ensureAudioContext, setStatus, log]);

  // --- Disconnect ---
  const disconnect = useCallback(() => {
    endingRef.current = true;
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'session.end' }));
        const socket = wsRef.current;
        endTimerRef.current = window.setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CLOSING) {
            socket.close();
          }
          endTimerRef.current = null;
        }, 2000);
      }
      wsRef.current = null;
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
  const startSession = useCallback(async () => {
    endingRef.current = false;
    try {
      const res = await fetch('/api/token');
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
  }, [connect, ensureAudioContext, startMicrophone, setStatus]);

  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return {
    state,
    startSession,
    disconnect,
    isRecording: state.status === 'recording',
    isConnected: state.status === 'connected' || state.status === 'recording',
  };
}

function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 0x8000;
  }
  return float32Array;
}