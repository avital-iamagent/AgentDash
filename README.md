# AgentDash

A visual project dashboard where you and Claude Code collaborate through the full software development lifecycle — from brainstorming to implementation.

AgentDash is a web wrapper around Claude Code, built on the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk). It doesn't call the Anthropic API directly — it spawns Claude Code as a subprocess and communicates through the SDK, inheriting your existing Claude Code authentication. If Claude Code works on your machine, AgentDash works too.

Instead of free-form chat, it turns Claude Code into a structured development partner that guides your project through five phases, each with a dedicated AI personality and a clear handoff to the next. All state lives in your file system as readable JSON and Markdown — no databases, no cloud, no magic.

## How It Works

You type prompts in the browser. Claude Code reads and writes structured files in a `.agentdash/` directory inside your project. A local Express server bridges the two using the Claude Agent SDK, streaming responses in real time over WebSocket.

The UI is read-only — only Claude modifies project state. This keeps things simple and conflict-free.

## The Five Phases

| Phase | AI Personality | What Happens |
|-------|---------------|-------------|
| **Brainstorm** | The Devil's Advocate | Capture and challenge ideas on a card canvas |
| **Research** | The Skeptical Analyst | Gather evidence, question sources, build a knowledge base |
| **Architecture** | The Pragmatic Engineer | Design components and relationships with Mermaid diagrams |
| **Environment** | The Meticulous Ops Engineer | Set up everything needed before writing code |
| **Tasks** | The Clear-Headed PM | Break work into a Kanban board, then execute with a built-in coding mode (The Master Engineer) that works through tasks, commits after each, and updates state in place |

Each phase produces a compact handoff artifact that becomes the sole context for the next phase — solving the AI context-loss problem.

### Cross-Phase Tools

- **Research Assistant** — spin up in any phase to investigate a question without leaving your current work
- **Phase Review** — optional auditor that checks completeness and consistency at the end of a phase

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- Node.js 18+
- git

## Installation

The quickest way to install is with Claude Code itself:

```bash
claude --allowedTools "Bash,Write,Edit,Read" -p "$(curl -sL https://raw.githubusercontent.com/avital-iamagent/AgentDash/main/install-prompt.md)"
```

The `--allowedTools` flag lets the installer run end-to-end without pausing for permission on every file write or shell command. It only applies to this session — your normal Claude Code settings are unchanged afterwards.

You'll still be asked a few interactive questions:
- **Install location** (default: `~/.agentdash/app/`)
- **Text-to-speech** on or off
- **Nano Banana** (Visuals) — optional AI image generation, requires a free [Google API key](https://aistudio.google.com/apikey)
- **Port** (default: 3141)

### Manual Installation

```bash
git clone https://github.com/avital-iamagent/AgentDash.git
cd AgentDash
npm install
npm run build
```

## Usage

```bash
# Start the dashboard (opens http://localhost:3141)
agentdash

# Or if installed manually
npm start
```

### CLI Options

```
agentdash                  Start the server (default port: 3141)
agentdash --port <number>  Start on a specific port
agentdash --tts on|off     Enable or disable text-to-speech
agentdash --help           Show this help message
```

Configuration is stored in `~/.agentdash/config.json`.

## Development

```bash
# Run dev server with hot reload (frontend + backend)
npm run dev
```

This starts Vite (frontend) and tsx watch (backend) concurrently.

## Tech Stack

React 19, TypeScript, Vite, Tailwind CSS, Express 5, WebSocket, Zustand, Zod, Mermaid.js, Claude Agent SDK

## License

MIT
