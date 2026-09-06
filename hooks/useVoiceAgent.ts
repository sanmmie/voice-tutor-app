import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolCall, ToolCallUI, TranscriptMessage, VoiceAgentState } from '@/lib/types';
import { float32ToInt16, chunkPCM16, int16ToBase64 } from '@/utils/audio';

const SAMPLE_RATE = 24000;
const CHUNK_MS = 50;
const CHUNK_SAMPLES = (SAMPLE_RATE * CHUNK_MS) / 1000; // 1200

interface UseVoiceAgentOptions {
  onTranscript?: (msg: TranscriptMessage) => void;
  onToolCall?: (call: ToolCallUI) => void;
  onStatusChange?: (status: VoiceAgentState['status']) => void;
}

export function useVoiceAgent(options: UseVoiceAgentOptions = {}) {
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
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);

  const setStatus = (status: VoiceAgentState['status']) => {
    setState((prev) => ({ ...prev, status }));
    options.onStatusChange?.(status);
  };

  const addUserTranscript = (text: string, isFinal: boolean) => {
    const msg: TranscriptMessage = { type: 'transcript.user', text, timestamp: Date.now(), isFinal };
    setState((prev) => ({
      ...prev,
      userTranscripts: [...prev.userTranscripts, msg],
    }));
    options.onTranscript?.(msg);
  };

  const addAgentTranscript = (text: string) => {
    const msg: TranscriptMessage = { type: 'transcript.agent', text, timestamp: Date.now(), isFinal: true };
    setState((prev) => ({
      ...prev,
      agentTranscripts: [...prev.agentTranscripts, msg],
    }));
    options.onTranscript?.(msg);
  };

  const addToolCall = (call: ToolCallUI) => {
    setState((prev) => ({
      ...prev,
      toolCalls: [...prev.toolCalls, call],
    }));
    options.onToolCall?.(call);
  };

  const updateToolCallResult = (callId: string, result: any, status: 'success' | 'error' = 'success') => {
    setState((prev) => ({
      ...prev,
      toolCalls: prev.toolCalls.map((tc) =>
        tc.call_id === callId ? { ...tc, result, status } : tc
      ),
    }));
  };

  // --- Audio Playback ---
  const playAudioChunk = useCallback((base64Data: string) => {
    const floatData = base64ToFloat32(base64Data);
    audioQueueRef.current.push(floatData);
    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      processQueue();
    }
  }, []);

  const processQueue = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    const chunk = audioQueueRef.current.shift()!;
    const buffer = ctx.createBuffer(1, chunk.length, SAMPLE_RATE);
    buffer.copyToChannel(chunk, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startTime = Math.max(nextPlayTimeRef.current, ctx.currentTime);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;

    source.onended = () => {
      processQueue();
    };
  }, []);

  // --- Connect ---
  const connect = useCallback(async (token: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');
    setState((prev) => ({ ...prev, error: null }));

    const ws = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      // Send session.update immediately
      ws.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            system_prompt:
              "You are a patient, encouraging coding and math mentor. You explain concepts step-by-step, use analogies, and guide the user to the answer rather than giving it away immediately. You're friendly and conversational. When the user asks a math question, use the calculate tool. When they ask about a programming concept, use search_docs first, then get_code_example if they want to see code.",
            greeting:
              "Hi there! I'm your voice tutor. I can help with Python, algorithms, web development, or math. What would you like to learn today?",
            input: {
              format: { encoding: 'audio/pcm' },
              keyterms: [
                'Python',
                'algorithm',
                'function',
                'variable',
                'loop',
                'API',
                'React',
                'SQL',
                'debugging',
                'calculus',
                'algebra',
                'equation',
                'recursion',
                'binary tree',
                'sorting',
                'data structure',
              ],
              turn_detection: {
                vad_threshold: 0.5,
                min_silence: 300,
                max_silence: 1500,
                interrupt_response: true,
              },
            },
            output: {
              voice: 'michael',
              format: { encoding: 'audio/pcm' },
            },
            tools: toolDefinitions,
          },
        })
      );
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      // console.log('WS received:', data.type);

      switch (data.type) {
        case 'session.ready':
          sessionIdRef.current = data.session_id;
          setState((prev) => ({ ...prev, sessionId: data.session_id }));
          setStatus('recording');
          break;

        case 'transcript.user':
          // Partials and final user transcripts
          addUserTranscript(data.text, data.is_final || false);
          break;

        case 'transcript.agent':
          addAgentTranscript(data.text);
          break;

        case 'reply.audio':
          // Audio chunk from the agent — play it
          if (data.data) {
            playAudioChunk(data.data);
          }
          break;

        case 'reply.done':
          if (data.status === 'interrupted') {
            // User interrupted — flush audio queue
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            nextPlayTimeRef.current = 0;
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

          // Execute the tool via the server API
          try {
            const res = await fetch('/api/tool', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: data.name, args: data.arguments }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Tool execution failed');
            updateToolCallResult(data.call_id, json.result, 'success');
            // Send the result back to AssemblyAI
            ws.send(
              JSON.stringify({
                type: 'tool.result',
                call_id: data.call_id,
                result: json.result,
              })
            );
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Tool failed';
            updateToolCallResult(data.call_id, { error: errorMsg }, 'error');
            ws.send(
              JSON.stringify({
                type: 'tool.result',
                call_id: data.call_id,
                result: { error: errorMsg },
              })
            );
          }
          break;
        }

        case 'error':
          setState((prev) => ({ ...prev, error: data.message || 'Unknown error' }));
          setStatus('error');
          break;

        default:
          // Ignore other events (e.g., input.speech.started/stopped)
          break;
      }
    };

    ws.onclose = (event) => {
      setStatus('disconnected');
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
  }, [playAudioChunk, addUserTranscript, addAgentTranscript, addToolCall, updateToolCallResult]);

  // --- Start Microphone ---
  const startMicrophone = useCallback(async () => {
    if (audioContextRef.current) {
      // Already running
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      let pcmBuffer = new Int16Array(0);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const int16 = float32ToInt16(inputData);
        // Append to buffer
        const newBuffer = new Int16Array(pcmBuffer.length + int16.length);
        newBuffer.set(pcmBuffer);
        newBuffer.set(int16, pcmBuffer.length);
        pcmBuffer = newBuffer;

        // If we have enough data for a chunk, send it
        while (pcmBuffer.length >= CHUNK_SAMPLES) {
          const chunk = pcmBuffer.slice(0, CHUNK_SAMPLES);
          pcmBuffer = pcmBuffer.slice(CHUNK_SAMPLES);
          const base64 = int16ToBase64(chunk);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'input.audio',
                audio: base64,
              })
            );
          }
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      // Resume context if suspended
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to access microphone',
      }));
      setStatus('error');
    }
  }, []);

  // --- Disconnect ---
  const disconnect = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'session.end' }));
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    // Stop microphone
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Reset playback
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    sessionIdRef.current = null;

    setStatus('idle');
    setState((prev) => ({
      ...prev,
      sessionId: null,
    }));
  }, []);

  // --- Initiate session (fetch token, connect, start mic) ---
  const startSession = useCallback(async () => {
    try {
      const res = await fetch('/api/token');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get token');
      await connect(data.token);
      await startMicrophone();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Startup failed',
      }));
      setStatus('error');
    }
  }, [connect, startMicrophone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    startSession,
    disconnect,
    isRecording: state.status === 'recording',
    isConnected: state.status === 'connected' || state.status === 'recording',
  };
}

// Helper import for base64ToFloat32
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