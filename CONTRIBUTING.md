# Contributing to VoxAI

Thank you for your interest in contributing to VoxAI! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/voxai.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Commit your changes: `git commit -m "feat: add your feature description"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Open a Pull Request

## Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- ffmpeg

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env  # Configure your API keys
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Code Style

### Python
- Follow PEP 8
- Use type hints
- Run `ruff check backend/app/` before committing

### TypeScript/React
- Use TypeScript strict mode
- Follow existing code patterns

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Description |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `style:` | Code style changes |
| `refactor:` | Code refactoring |
| `test:` | Adding or updating tests |
| `chore:` | Maintenance tasks |

## Pull Request Guidelines

- Keep PRs focused on a single change
- Update documentation if needed
- Test your changes locally before submitting
- Write a clear PR description

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
