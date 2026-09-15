export const agentConfig = {
  // Read from the documented env vars (NEXT_PUBLIC_TUTOR_*). The previous
  // version read NEXT_PUBLIC_TUTOR_SYSTEM_PROMPT but the .env.example.txt
  // documented the bare TUTOR_SYSTEM_PROMPT, so documented customization
  // silently never applied — the fallbacks always won. Support both spellings
  // so existing setups keep working.
  systemPrompt:
    process.env.NEXT_PUBLIC_TUTOR_SYSTEM_PROMPT ||
    process.env.TUTOR_SYSTEM_PROMPT ||
    "You are a patient, encouraging coding and math mentor. Explain concepts step-by-step, use analogies, and guide the user to the answer rather than giving it away immediately. When the user asks a math question, use the calculate tool. When they ask about programming, use search_docs first, then get_code_example if they want code.",
  greeting:
    process.env.NEXT_PUBLIC_TUTOR_GREETING ||
    process.env.TUTOR_GREETING ||
    "Hi there! I'm your voice tutor. I can help with Python, algorithms, web development, or math. What would you like to learn today?",
  voice: process.env.NEXT_PUBLIC_TUTOR_VOICE || process.env.TUTOR_VOICE || 'michael',
} as const;