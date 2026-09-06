export interface ToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export interface ToolCall {
  call_id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface TranscriptMessage {
  type: 'transcript.user' | 'transcript.agent';
  text: string;
  timestamp: number;
  isFinal?: boolean;
}

export interface ToolCallUI {
  call_id: string;
  name: string;
  args: Record<string, any>;
  result?: any;
  status: 'pending' | 'success' | 'error';
}

export interface VoiceAgentState {
  status: 'idle' | 'connecting' | 'connected' | 'recording' | 'disconnected' | 'error';
  sessionId: string | null;
  userTranscripts: TranscriptMessage[];
  agentTranscripts: TranscriptMessage[];
  toolCalls: ToolCallUI[];
  error: string | null;
}