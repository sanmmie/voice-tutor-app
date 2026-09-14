// Convert Float32 audio samples to Int16 PCM for base64 encoding.
// Clamp to [-1, 1] and map symmetrically so that full-scale negative samples
// reach -32768 (not -32767, which is an unreachable value for int16).
export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

export function resampleFloat32(data: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return data;
  const outputLength = Math.max(1, Math.round(data.length * outputRate / inputRate));
  const output = new Float32Array(outputLength);
  const ratio = inputRate / outputRate;
  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const lower = Math.floor(position);
    const upper = Math.min(lower + 1, data.length - 1);
    const fraction = position - lower;
    output[i] = data[lower] * (1 - fraction) + data[upper] * fraction;
  }
  return output;
}

// Convert base64 PCM16 to Float32 for playback.
//
// IMPORTANT: base64 length is not always even. Odd-length base64 decodes to
// an odd number of bytes, and the final byte is the low half of the last int16
// sample. Creating an Int16Array view over an odd-length ArrayBuffer throws
// (or silently misaligns) on some engines, garbling playback. Pad the buffer
// to an even byte length and zero the dangling byte before viewing.
export function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const byteLength = binary.length;
  const buffer = new ArrayBuffer(byteLength % 2 === 0 ? byteLength : byteLength + 1);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16Array = new Int16Array(buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 0x8000;
  }
  return float32Array;
}

// Chunk an array buffer into ~50ms frames (24000 * 0.05 = 1200 samples per channel, mono = 2400 bytes)
const CHUNK_SAMPLES = 1200; // 50ms at 24kHz
const CHUNK_BYTES = CHUNK_SAMPLES * 2; // 16-bit PCM = 2 bytes per sample

export function chunkPCM16(data: Int16Array): Int16Array[] {
  const chunks: Int16Array[] = [];
  for (let i = 0; i < data.length; i += CHUNK_SAMPLES) {
    const end = Math.min(i + CHUNK_SAMPLES, data.length);
    chunks.push(data.slice(i, end));
  }
  return chunks;
}

export function int16ToBase64(data: Int16Array): string {
  // View only the bytes the Int16Array actually covers. Using the whole
  // `data.buffer` would include any trailing bytes from a larger underlying
  // buffer when `data` is a view (e.g. an Int16Array.slice that shares its
  // parent's storage), producing malformed base64.
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}