# Mobbin Remote MCP Server

A lightweight, Docker-ready Model Context Protocol (MCP) remote server that connects OpenCode (and other MCP clients) to the Mobbin REST API using API Keys.

## Features

- **No OAuth browser flow required**: Connects directly via Mobbin REST API Key.
- **Docker & Docker Compose**: 1-click deployment on VPS (Easypanel, Coolify, Dokku, Portainer).
- **Security First**: Supports passing API Keys via environment variables (`MOBBIN_API_KEY`) or dynamic `Authorization: Bearer <API_KEY>` headers per request. **No hardcoded credentials.**
- **OpenCode Ready**: Compatible with OpenCode's `mcp` remote server configuration.

## Quick Start (Local / Node.js)

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set your Mobbin API Key:
   ```bash
   cp .env.example .env
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Deploy with Docker

Build and run using Docker Compose:

```bash
docker compose up -d --build
```

Or deploy directly to **Easypanel** / **Coolify**:
- **Repository**: `https://github.com/bridevmx/mobbin-mcp-server`
- **Build Type**: Dockerfile or Docker Compose
- **Port**: `3000`
- **Environment Variable**:
  - `MOBBIN_API_KEY`: `sk_your_mobbin_api_key`

## OpenCode Integration

In your `opencode.json` (or `~/.config/opencode/opencode.json`), configure Mobbin as a remote MCP server:

```json
{
  "mcp": {
    "mobbin": {
      "type": "remote",
      "url": "https://your-vps-domain.com/sse",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer sk_your_mobbin_api_key"
      }
    }
  }
}
```

If `MOBBIN_API_KEY` is already set as an environment variable in your VPS deployment, you can omit the `headers` field:

```json
{
  "mcp": {
    "mobbin": {
      "type": "remote",
      "url": "https://your-vps-domain.com/sse",
      "enabled": true
    }
  }
}
```

## Endpoints

- `GET /health` - Health check.
- `GET /sse` - MCP Server-Sent Events stream entrypoint.
- `POST /messages?sessionId=...` - MCP protocol message handler.

## License

MIT
