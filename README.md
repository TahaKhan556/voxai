<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/PRs-Welcome-orange?style=for-the-badge" alt="PRs Welcome">
</p>

<h1 align="center">VoxAI</h1>

<p align="center">
  <strong>Open-Source AI Voice & Image Generation Platform</strong>
</p>

<p align="center">
  Generate images, synthesize voice with emotion, and enhance your creative workflow — all powered by free AI models.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#api-reference">API</a> •
  <a href="#deployment">Deploy</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Highlights

- **100% Free APIs** — No paid services required. Uses Pollinations.ai, Kokoro TTS, and faster-whisper
- **Grok-like Premium UI** — Dark, modern interface with smooth animations
- **Voice Synthesis** — Text-to-speech with 14 emotion presets (excited, dramatic, whisper, etc.)
- **Image Generation** — Create images from text with AI prompt enhancement
- **Speech-to-Text** — Local transcription using faster-whisper (no API needed)
- **AI Chat** — Built-in chat assistant powered by Mimo v2.5

## Features

| Feature | Description |
|---------|-------------|
| `/image <prompt>` | Generate images from text descriptions |
| `/voice` | Open Voice Studio for TTS and script generation |
| **AI Prompt Enhancement** | Refine simple prompts into detailed image descriptions |
| **Emotion Expressions** | 14 voice emotion presets (excited, sad, dramatic, etc.) |
| **AI Script Generation** | Auto-generate voice scripts with expression markers |
| **Multi-Model Support** | Choose from 9+ image models (FLUX, Grok, Ideogram, etc.) |
| **Local STT** | Transcribe audio using faster-whisper (runs offline) |
| **Chat Assistant** | Ask anything about image/voice generation |

## Tech Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| **Backend** | Python 3.10+ / FastAPI | Free |
| **Frontend** | Next.js 14 / React 19 / Tailwind CSS | Free |
| **Image Generation** | Pollinations.ai API | Free |
| **Text-to-Speech** | Kokoro (local) | Free |
| **Speech-to-Text** | faster-whisper (local) | Free |
| **AI Assistant** | Mimo v2.5 / Jugaar AI | Free tier |
| **Deployment** | Docker / PM2 / Nginx | Free |

## Quick Start

### With Docker (Recommended)

```bash
git clone https://github.com/TahaKhan556/voxai.git
cd voxai

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start all services
docker-compose up -d

# Open http://localhost:3000
```

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure
cp ../.env.example ../.env
# Edit .env with your API keys

# Start server
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev

# Open http://localhost:3000
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Required |
|----------|-------------|----------|
| `POLLINATIONS_API_KEY` | Pollinations.ai API key ([free](https://enter.pollinations.ai)) | Yes |
| `MIMO_API_KEY` | Jugaar AI API key for chat/prompt enhancement | Yes |
| `MIMO_BASE_URL` | Jugaar AI API endpoint | Yes |
| `MIMO_MODEL` | AI model name | Yes |
| `WHISPER_MODEL` | Whisper model size (`tiny`, `base`, `small`) | No |
| `WHISPER_DEVICE` | Compute device (`cpu`, `cuda`) | No |

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/image/generate` | Generate image from prompt |
| `GET` | `/api/image/models` | List available image models |
| `POST` | `/api/voice/tts` | Text-to-speech conversion |
| `POST` | `/api/voice/stt` | Speech-to-text transcription |
| `GET` | `/api/voice/voices` | List available voices |
| `GET` | `/api/voice/emotions` | List emotion presets |
| `POST` | `/api/ai/refine-prompt` | Enhance image prompt with AI |
| `POST` | `/api/ai/generate-script` | Generate voice script |
| `POST` | `/api/ai/chat` | Chat with AI assistant |

### Example: Generate Image

```bash
curl -X POST http://localhost:8000/api/image/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a sunset over mountains", "model": "flux"}'
```

### Example: Text-to-Speech

```bash
curl -X POST http://localhost:8000/api/voice/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world!", "voice": "af_heart", "emotion": "happy"}' \
  --output speech.mp3
```

## Project Structure

```
voxai/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── config.py         # Configuration
│   │   ├── routes/           # API routes
│   │   │   ├── image.py      # Image generation endpoints
│   │   │   ├── voice.py      # TTS & STT endpoints
│   │   │   └── ai.py         # AI chat & prompt enhancement
│   │   ├── services/         # Business logic
│   │   │   ├── pollinations.py   # Pollinations.ai client
│   │   │   ├── tts_service.py    # Kokoro TTS
│   │   │   ├── whisper_stt.py    # faster-whisper STT
│   │   │   └── mimo_ai.py        # AI chat client
│   │   └── models/           # Pydantic schemas
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx      # Main application
│   │   │   ├── layout.tsx    # Root layout
│   │   │   └── globals.css   # Global styles
│   │   └── lib/
│   │       └── api.ts        # API client
│   ├── package.json
│   └── Dockerfile
├── deploy/
│   └── deploy.sh             # Server deployment script
├── docker-compose.yml
├── .env.example
└── README.md
```

## Deployment

### Docker Compose

```bash
docker-compose up -d --build
```

### Server Deployment

```bash
# On the server
cd /home/projects/voxai
./deploy/deploy.sh
```

The deploy script handles:
1. Pulling latest code
2. Installing dependencies
3. Building frontend
4. Restarting services via PM2
5. Health check verification

### CI/CD

GitHub Actions workflow runs on push to `main`:
1. **Lint & Typecheck** — Python compile check + TypeScript check
2. **Deploy** — Triggers server deployment via webhook

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

To report security vulnerabilities, please see [SECURITY.md](SECURITY.md).

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with free AI APIs — no expensive services required.
</p>
