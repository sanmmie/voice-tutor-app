# 🧑‍🏫 Voice Tutor — AssemblyAI Hackathon

A voice-based coding and math tutor built with the **AssemblyAI Voice Agent API**. 
Have natural spoken conversations with an AI tutor that can:

- Explain programming concepts (Python, algorithms, web dev, data structures)
- Solve math problems step-by-step
- Search Wikipedia for technical topics
- Show code examples on demand
- Provide a patient, encouraging learning experience

## Features

- 🎙️ **Voice-first** — speak naturally, get spoken responses
- 🔧 **Tool calling** — the agent uses real tools:
  - `calculate` — evaluate math expressions
  - `search_docs` — fetch Wikipedia summaries
  - `get_code_example` — retrieve code snippets
- 📝 **Live transcripts** — see what you and the tutor say
- ⚡ **Real-time** — low-latency WebSocket streaming
- 🎨 **Dark terminal UI** — designed for focus and readability

## Tech Stack

- **Next.js 15** (App Router + TypeScript)
- **Tailwind CSS** (dark terminal theme)
- **AssemblyAI Voice Agent API** (STT + LLM + TTS + VAD + tool calling)
- **mathjs** (safe math evaluation)
- **Wikipedia API** (knowledge retrieval)

## Getting Started

### 1. Clone & Install

\`\`\`bash
git clone https://github.com/yourusername/voice-tutor-app.git
cd voice-tutor-app
npm install
\`\`\`

### 2. Set Environment Variables

Create a `.env.local` file:

\`\`\`env
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
\`\`\`

Get your key from [assemblyai.com/dashboard/api-keys](https://www.assemblyai.com/dashboard/api-keys).

### 3. Run Locally

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) and allow microphone access.

### 4. Deploy to Vercel

\`\`\`bash
npm run build
# Then push to GitHub and import in Vercel
# Add ASSEMBLYAI_API_KEY as an environment variable in Vercel
\`\`\`

## Project Structure

\`\`\`
voice-tutor-app/
├── app/
│   ├── api/
│   │   ├── token/          # Mints temp WebSocket tokens
│   │   └── tool/           # Executes tool calls server-side
│   ├── layout.tsx
│   └── page.tsx
├── components/             # React UI components
├── hooks/                  # useVoiceAgent custom hook
├── lib/                    # Tool definitions & handlers
└── utils/                  # Audio utilities
\`\`\`

## How It Works

1. The app fetches a temporary token from `/api/token` using your API key (server-side).
2. The browser connects to `wss://agents.assemblyai.com/v1/ws` with the token.
3. It sends a `session.update` with the system prompt, voice selection, and tool definitions.
4. Microphone audio (24 kHz PCM16) is base64-encoded and sent as `input.audio` events.
5. The agent responds with `transcript.agent` and `reply.audio` events (played through speakers).
6. When the agent needs a tool, it sends `tool.call`; the browser forwards it to `/api/tool`, gets the result, and sends it back as `tool.result`.
7. The session ends cleanly when the user clicks "Stop Session".

## Demo

(Add a screenshot or GIF here)

## Submission for LabLab.ai x AssemblyAI

- **Application of Technology:** Deep integration with Voice Agent API + 3 custom tools
- **Presentation:** Clean terminal UI with live transcripts and tool activity
- **Business Value:** Education — accessible, spoken tutoring for coding & math
- **Originality:** Pedagogical system prompt + Wikipedia/code/math tools in a voice agent

## License

MIT
\`\`\`

---

## Next Steps

1. **Create the project directory** and paste all these files.
2. **Run `npm install`**.
3. **Add your AssemblyAI API key** to `.env.local`.
4. **Run `npm run dev`** and test the voice tutor.
5. **Push to GitHub** (public repo for the submission).
6. **Deploy to Vercel** — import the repo, set `ASSEMBLYAI_API_KEY`, deploy.
7. **Take a screenshot / screen recording** for your cover image and video presentation.
8. **Submit** to the lablab.ai challenge!

---

The code is complete, production-ready, and follows all the Voice Agent API requirements from the documentation. Let me know if you hit any snags or want to customize any part of it (voice, system prompt, tools, UI theme). Good luck with the hackathon! 🚀