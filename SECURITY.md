# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in VoxAI, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please open a private security advisory on GitHub.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Fix or mitigation:** Within 2 weeks for critical issues

## Security Best Practices

When deploying VoxAI:

1. **Never commit `.env` files** — use `.env.example` as a template
2. **Use strong API keys** — rotate keys regularly
3. **Run behind HTTPS** — use a reverse proxy (Nginx) with TLS
4. **Restrict CORS** — update `allow_origins` in `main.py` for production
5. **Keep dependencies updated** — run `pip audit` and `npm audit` regularly

## Scope

This security policy applies to the latest release of VoxAI.
