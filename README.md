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

- **Next.js 16** (App Router + TypeScript)
- **Tailwind CSS** (dark terminal theme)
- **AssemblyAI Voice Agent API** (STT + LLM + TTS + VAD + tool calling)
- **mathjs** (safe math evaluation)
- **Wikipedia API** (knowledge retrieval)
- **Upstash Redis + bcryptjs** (distributed rate limiting and account identity)

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/sanmmie/voice-tutor-app.git
cd voice-tutor-app
npm install
```

### 2. Set Environment Variables

Create a `.env.local` file:

```env
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
SESSION_SECRET=generate-a-long-random-secret
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
NEXT_PUBLIC_TUTOR_SYSTEM_PROMPT=You are a patient, encouraging coding and math mentor.
NEXT_PUBLIC_TUTOR_GREETING=Hi there! I am your voice tutor. What would you like to learn today?
NEXT_PUBLIC_TUTOR_VOICE=michael
```

Get your key from [assemblyai.com/dashboard/api-keys](https://www.assemblyai.com/dashboard/api-keys).
Create the Redis variables in an Upstash Redis database. Generate `SESSION_SECRET` with a password manager or `openssl rand -base64 32`. All four variables are required in production; the API fails closed when the security configuration is incomplete.
Users create accounts with an email address and a password between 12 and 128 characters. Passwords are hashed with bcrypt and are never returned or logged. Account records and revocable sessions are stored in Redis, so every production instance shares the same identity state.

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and allow microphone access.

### 4. Deploy to Vercel

```bash
npm run build
# Then push to GitHub and import in Vercel
# Add ASSEMBLYAI_API_KEY as an environment variable in Vercel
# Add SESSION_SECRET, UPSTASH_REDIS_REST_URL, and UPSTASH_REDIS_REST_TOKEN too
```

### Production Operations

- `/api/health` is a public monitoring endpoint. It returns `200` when the security configuration and Redis connection are healthy, otherwise `503`.
- `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and `/api/auth/me` manage account identity and sessions.
- `/api/token` requires an authenticated account and is limited to 10 requests per IP per minute.
- `/api/tool` requires an authenticated account and same-origin requests, and is limited to 60 requests per user per minute.
- Tool execution is capped at five seconds; Wikipedia lookups time out after four seconds, and math expressions are bounded to prevent runaway evaluation.
- API requests emit structured JSON logs with request ID, route, status, duration, and client IP for ingestion by Vercel Logs or another centralized logging provider.
- Configure alerts on `/api/health` 5xx responses, elevated authentication or tool `429` responses, and upstream token failures.
## Project Structure

```
voice-tutor-app/
├── app/
│   ├── api/
│   │   ├── auth/           # Account registration, login, logout, and identity
│   │   ├── health/         # Deployment health check
│   │   ├── token/          # Mints temp WebSocket tokens
│   │   └── tool/           # Executes tool calls server-side
│   ├── layout.tsx
│   └── page.tsx
├── components/             # React UI components
├── hooks/                  # useVoiceAgent custom hook
├── lib/                    # Tool definitions & handlers
└── utils/                  # Audio utilities
```

## How It Works

1. The app fetches a temporary token from `/api/token` using your API key (server-side).
2. The browser connects to `wss://agents.assemblyai.com/v1/ws?token=...` with the single-use token.
3. It sends a `session.update` with the system prompt, voice selection, and tool definitions.
4. Microphone audio is captured at the browser’s native rate, resampled to 24 kHz PCM16, base64-encoded, and sent as `input.audio` events.
5. The agent responds with `transcript.agent` and `reply.audio` events (played through speakers).
6. When the agent needs a tool, it sends `tool.call`; the browser forwards it to `/api/tool`, queues the result, and sends it back as a JSON-string `tool.result` after `reply.done`, as required by the Voice Agent API.
7. The session ends cleanly when the user clicks "Stop Session".

## AssemblyAI API Alignment

This project uses the official [AssemblyAI Voice Agent API](https://www.assemblyai.com/docs/voice-agents/voice-agent-api) path for the hackathon:

- Server-side `GET /v1/token` minting keeps the AssemblyAI API key out of the browser.
- Browser WebSocket authentication uses a short-lived, single-use token.
- Inline `session.update` configuration supplies the tutor prompt, greeting, turn detection, keyterms, audio formats, and JSON-Schema function tools.
- Client-side function tools run through the authenticated `/api/tool` route and return `tool.result` only after the current `reply.done` event.
- `session.end` is sent before teardown to avoid the billable reconnect grace period.
- Intentional teardown waits for `session.ended` before closing the socket, with a two-second fallback for an unresponsive connection.
- If the WebSocket drops unexpectedly, the client fetches a fresh token and attempts `session.resume` within the provider’s 30-second recovery window. Fatal authentication/protocol closes are not retried.
- Microphone echo cancellation remains enabled, server-side noise suppression is preferred, and audio is resampled for Firefox and Safari compatibility.

The hackathon accepts either the Voice Agent API or the Realtime Speech-to-Text API. This submission uses the Voice Agent API because it provides the complete speech-to-text, LLM routing, voice output, turn-taking, and tool-calling flow in one connection.

## Demo

Add a 16:9 cover image and a video presentation of no more than five minutes when submitting to LabLab.ai.

## Submission for LabLab.ai x AssemblyAI

- **Application of Technology:** Deep integration with Voice Agent API + 3 custom tools
- **Presentation:** Clean terminal UI with live transcripts and tool activity
- **Business Value:** Education — accessible, spoken tutoring for coding & math
- **Originality:** Pedagogical system prompt + Wikipedia/code/math tools in a voice agent

## LabLab Submission Checklist

- **Title:** Voice Tutor (under the 50-character limit)
- **Short description:** A voice tutor for coding and mathematics that explains concepts aloud, solves problems step by step, and retrieves focused examples (under 255 characters)
- **Long description:** Explain the education problem, the voice-first interaction, AssemblyAI integration, server-side tools, account security, and how the app can scale with Redis-backed limits and sessions. Use at least 100 words.
- **Main tracks:** Education, Voice AI, Developer Tools
- **Technologies:** Next.js, React, TypeScript, AssemblyAI Voice Agent API, Upstash Redis, bcryptjs, mathjs, Tailwind CSS, Wikipedia API
- **Media:** Upload a 16:9 cover image and link a video under 300 MB and five minutes
- **Technical details:** Provide the GitHub repository URL, deployed demo platform, live demo URL, environment-variable requirements, and scaling notes
- **Final checks:** Verify the public demo, microphone permissions, account registration, tool calls, health endpoint, and production logs before submitting

## Submission Rules Checklist

- **Basic information:** Use a clear, descriptive project title and keep the short and long descriptions within the required character and word limits.
- **Tags:** Select accurate technology and category tags so judges can evaluate the project in the correct context.
- **Cover image:** Upload a PNG or JPG image with a 16:9 aspect ratio.
- **Presentation:** Prepare an MP4 video presentation and a PDF slide presentation as required submission materials.
- **Application:** Provide a public GitHub repository, deploy the demo on an accepted platform such as Vercel, and include the live application URL for interactive evaluation.
- **Judging criteria:** Explain the project’s presentation quality, business value, application of technology, and originality in the submission.
- **Manual submission:** Manual submission is available for up to six hours after the hackathon only for valid reasons with prior organizer or mentor approval.
- **Ethical conduct:** Do not plagiarize, manipulate voting, tamper with systems, use unauthorized automation, or submit fraudulent materials. Violations can result in disqualification.
- **Confidentiality:** Submission materials must be treated as confidential by judges and must not be copied, retained, or shared. Judges should abstain where a conflict of interest exists and disclose relevant affiliations.
- **Mini hackathon:** General rules still apply, and mentor support may be limited because this is an expert challenge.

## Participant Checklist

Before building and submitting, complete the official [lablab.ai getting-started guide](https://lablab.ai/getting-started-guide):

- Register for the event on the [lablab.ai event page](https://lablab.ai/ai-hackathons) and complete your [participant profile](https://lablab.ai/profile).
- Open the specific event page and create or join a team. Teams may include no more than six participants; individual participation is also allowed.
- Connect with the lablab.ai Discord server. Use `#ineedhelp` and tag `@Mentor` for mentor assistance, `#faq` for general questions, and the active-hackathon or looking-for-a-team channels for collaboration.
- Use the team voice channels and their text chat for coordination. Team leaders can invite members through the dashboard’s teammate or invitation controls.
- Watch the hackathon kickoff on [lablab.ai’s Twitch channel](https://www.twitch.tv/lablabai) and check Discord for the recording afterward.
- Submit the project from the team dashboard before the event deadline, including the title, descriptions, tracks, technologies, media, repository, demo URL, and scaling notes listed above.

## License

MIT