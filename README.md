# Omegle Next Global

Production-ready anonymous random chat platform with real-time text/video, smarter matchmaking, and AI-enabled translation + subtitle processing.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS + Zustand + Socket.IO + WebRTC
- Backend: Node.js + Express + Socket.IO
- Persistence: SQLite (`better-sqlite3`)
- AI Providers: Mock (default), LibreTranslate, OpenAI-ready adapters

## Folder Structure

```txt
omegle/
  client/
    src/
      components/
      constants/
      hooks/
      services/
      store/
      utils/
      App.jsx
      main.jsx
      index.css
    .env.example
    package.json
    tailwind.config.js
    vercel.json
  server/
    src/
      config/
      db/
      middleware/
      routes/
      services/
      socket/
      utils/
      index.js
    .env.example
    package.json
    render.yaml
  .gitignore
  README.md
```

## Features Implemented

### Core
- Anonymous login with persistent local session ID
- Queue-based random matchmaking
- One-to-one text + video chat
- Instant `Next` switching
- Real-time messaging + typing indicator
- WebRTC signaling relay over Socket.IO
- Responsive modern UI

### Improved
- Interest-based matching
- Region + gender preference filters
- Session chat history in UI
- Reconnect flow
- Dark mode
- Sound notifications
- Smooth transitions/animations

### Multi-language + AI Communication
- Message translation with source language detection
- Original + translated chat rendering
- Live subtitle pipeline (`subtitle:chunk -> STT -> translate -> subtitle:update`)
- Browser speech recognition hook in frontend
- API hooks for:
  - translation provider
  - speech-to-text provider
  - moderation provider
  - text-to-speech (route scaffold)

### Safety & Moderation
- Profanity masking
- Report button + report logging
- Temporary blocking of reported pairs
- AI moderation hook with OpenAI adapter
- HTTP rate limiting + socket message rate limiting
- Auto-skip inactive users
- Reputation score updates on activity/reports

### Persistence
- SQLite-backed profiles/reputation
- Persistent reports table
- Persistent temporary pair block records
- Persistent chat session metadata
- Persistent chat message metadata

## Setup

### 1) Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.

### 2) Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment Variables

### Server (`server/.env`)
- `PORT`
- `CLIENT_ORIGIN`
- `QUEUE_SWEEP_MS`
- `INACTIVITY_TIMEOUT_MS`
- `TEMPORARY_BLOCK_MS`
- `SOCKET_MESSAGE_LIMIT`
- `SOCKET_MESSAGE_WINDOW_MS`

### Persistence
- `DB_ENABLED=true|false`
- `DB_FILE=./db.sqlite3`

### Provider Selection
- `TRANSLATION_PROVIDER=mock|libre|openai`
- `STT_PROVIDER=mock|openai`
- `MODERATION_PROVIDER=mock|openai`
- `LIBRETRANSLATE_URL=...`

### OpenAI Provider Config
- `OPENAI_API_KEY=...`
- `OPENAI_BASE_URL=https://api.openai.com/v1`
- `OPENAI_MODERATION_MODEL=omni-moderation-latest`
- `OPENAI_TRANSLATION_MODEL=gpt-4o-mini`
- `OPENAI_STT_MODEL=whisper-1`

### Client (`client/.env`)
- `VITE_SOCKET_URL=http://localhost:4000`
- `VITE_TURN_URL=turn:your-turn-host:3478`
- `VITE_TURN_USERNAME=...`
- `VITE_TURN_CREDENTIAL=...`

## Matchmaking Flow
1. User joins queue with interests/language/region/gender prefs.
2. Server computes candidate score from shared interests, language/region affinity, reputation, and gender preference compatibility.
3. Best valid pair is matched and assigned a room.
4. Pair metadata and room context are emitted to both clients.

## WebRTC Flow
1. On `match:found`, clients create peer connection.
2. One side deterministically creates offer.
3. Backend relays `offer/answer/ice` events.
4. Media streams connect peer-to-peer.
5. Optional TURN is used when `VITE_TURN_*` env vars are provided.

## Translation + Subtitle Flow

### Chat Translation
1. `chat:message` arrives on backend.
2. Message is profanity-filtered + AI-moderated.
3. Source language is detected.
4. Backend translates message for sender and receiver target languages.
5. Both original + translated text are emitted.

### Subtitle Pipeline
1. Frontend speech hook emits `subtitle:chunk` (transcript).
2. Backend can also transcribe `audioBase64` via OpenAI when provided.
3. Backend translates subtitle for each side.
4. Frontend renders subtitle overlay on video panel.

## Deployment

### Frontend (Vercel)
- Project root: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Env: `VITE_SOCKET_URL=https://<render-backend-url>`
- Optional TURN env vars for production call reliability.

### Backend (Render)
- Project root: `server`
- Build: `npm install`
- Start: `npm start`
- Set all server env vars from `.env.example`

## Quick Production Profile
- `TRANSLATION_PROVIDER=openai`
- `STT_PROVIDER=openai`
- `MODERATION_PROVIDER=openai`
- Add OpenAI key and model envs
- Keep SQLite enabled, or replace `PersistenceService` with managed DB adapter when scaling.
