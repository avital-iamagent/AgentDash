#!/bin/bash
# AgentDash Installer — non-interactive install script
# Usage: install.sh --path <path> --port <port> --tts <true|false> [--google-api-key <key>]

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────
INSTALL_PATH="$HOME/.agentdash/app"
PORT=3141
TTS=false
GOOGLE_API_KEY=""
MODEL="opus"

# ── Parse arguments ───────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --path)
      INSTALL_PATH="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --tts)
      TTS="$2"
      shift 2
      ;;
    --google-api-key)
      GOOGLE_API_KEY="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    *)
      echo "❌ Unknown argument: $1"
      exit 1
      ;;
  esac
done

# Expand ~ in path
INSTALL_PATH="${INSTALL_PATH/#\~/$HOME}"

# ── Prerequisites ─────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋  Checking prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PREREQS_OK=true

# Claude Code
if CLAUDE_VERSION=$(claude --version 2>/dev/null); then
  echo "  ✅  Claude Code ── $CLAUDE_VERSION"
else
  echo "  ❌  Claude Code ── not found"
  echo ""
  echo "  AgentDash requires Claude Code to be installed and authenticated."
  echo "  👉 https://docs.anthropic.com/en/docs/claude-code"
  PREREQS_OK=false
fi

# git
if GIT_VERSION=$(git --version 2>/dev/null | sed 's/git version //'); then
  echo "  ✅  git ── v$GIT_VERSION"
else
  echo "  ❌  git ── not found"
  echo ""
  echo "  👉 Run: xcode-select --install"
  PREREQS_OK=false
fi

# Node.js
if NODE_VERSION_RAW=$(node --version 2>/dev/null); then
  NODE_MAJOR=$(echo "$NODE_VERSION_RAW" | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 18 ]; then
    echo "  ✅  Node.js ── $NODE_VERSION_RAW"
  else
    echo "  ❌  Node.js ── $NODE_VERSION_RAW (need 18+)"
    PREREQS_OK=false
  fi
else
  echo "  ⏳  Node.js ── not found, attempting install..."
  if command -v brew &>/dev/null; then
    brew install node
    echo "  ✅  Node.js ── $(node --version)"
  else
    echo "  ❌  Node.js ── not found and Homebrew not available"
    echo ""
    echo "  Install Node.js 18+ from https://nodejs.org or install Homebrew first."
    PREREQS_OK=false
  fi
fi

if [ "$PREREQS_OK" = false ]; then
  echo ""
  echo "  ❌  Prerequisites not met. Please fix the issues above and re-run."
  exit 1
fi

echo ""
echo "  All prerequisites met ✨"

# ── Clone / Upgrade ───────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📁  Install & build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$INSTALL_PATH/package.json" ] && grep -q '"name".*"agentdash"' "$INSTALL_PATH/package.json" 2>/dev/null; then
  echo "  🔄  Found existing installation — upgrading..."
  cd "$INSTALL_PATH"
  git pull || { echo "  ❌  git pull failed"; exit 1; }
  echo "  ✅  Repository updated"
else
  echo "  ⏳  Cloning repository..."
  mkdir -p "$(dirname "$INSTALL_PATH")"
  git clone --depth 1 https://github.com/avital-iamagent/AgentDash.git "$INSTALL_PATH" || {
    echo "  ❌  Clone failed. Check your network connection and GitHub access."
    exit 1
  }
  echo "  ✅  Repository cloned"
fi

cd "$INSTALL_PATH"

# ── Install dependencies ──────────────────────────────────
echo ""
echo "  ⏳  Installing dependencies... (this takes a minute)"
npm install --loglevel=error || {
  echo "  ❌  npm install failed"
  echo "  💡  Try: npm cache clean --force, then re-run the installer"
  exit 1
}
echo "  ✅  Dependencies installed"

# ── Build ─────────────────────────────────────────────────
echo ""
echo "  ⏳  Building production frontend..."
npm run build 2>&1 || {
  echo "  ❌  Build failed"
  echo "  💡  Open an issue at https://github.com/avital-iamagent/AgentDash/issues"
  exit 1
}
echo "  ✅  Build complete"

# ── Config ────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ⚙️   Writing config"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

mkdir -p "$HOME/.agentdash/bin"

CONFIG_FILE="$HOME/.agentdash/config.json"

# Use node to merge config (preserves existing fields)
node -e "
const fs = require('fs');
const path = '$CONFIG_FILE';
let config = {};
try { config = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
config.installPath = '$INSTALL_PATH';
config.tts = $TTS;
config.port = $PORT;
config.model = '$MODEL';
const key = '$GOOGLE_API_KEY';
if (key) config.googleApiKey = key;
fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
"

echo "  ✅  Config saved → $CONFIG_FILE"

# ── CLI Wrapper ───────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔧  Setting up CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CLI_PATH="$HOME/.agentdash/bin/agentdash"

cat > "$CLI_PATH" << 'WRAPPER'
#!/bin/bash
# AgentDash CLI launcher
CONFIG="$HOME/.agentdash/config.json"

if [ ! -f "$CONFIG" ]; then
  echo "Error: AgentDash config not found at $CONFIG"
  echo "Please re-run the installer."
  exit 1
fi

INSTALL_PATH=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CONFIG','utf8')).installPath)")

if [ ! -d "$INSTALL_PATH" ]; then
  echo "Error: AgentDash not found at $INSTALL_PATH"
  echo "Please re-run the installer."
  exit 1
fi

exec node "$INSTALL_PATH/dist-server/bin/agentdash.js" "$@"
WRAPPER

chmod +x "$CLI_PATH"
echo "  ✅  CLI wrapper created"

# PATH setup
SHELL_RC=""
if [[ "$SHELL" == *"zsh"* ]]; then
  SHELL_RC="$HOME/.zshrc"
elif [ -f "$HOME/.bash_profile" ]; then
  SHELL_RC="$HOME/.bash_profile"
elif [ -f "$HOME/.bashrc" ]; then
  SHELL_RC="$HOME/.bashrc"
else
  SHELL_RC="$HOME/.zshrc"
fi

if echo "$PATH" | grep -q '.agentdash/bin' 2>/dev/null || grep -q '.agentdash/bin' "$SHELL_RC" 2>/dev/null; then
  echo "  ✅  PATH already configured"
else
  printf '\n# AgentDash\nexport PATH="$HOME/.agentdash/bin:$PATH"\n' >> "$SHELL_RC"
  echo "  ✅  Added to PATH (via $(basename "$SHELL_RC"))"
fi

# Verify
if "$CLI_PATH" --help > /dev/null 2>&1; then
  echo "  ✅  CLI verified"
else
  echo "  ❌  CLI verification failed — check $CLI_PATH"
  exit 1
fi

# ── Success ───────────────────────────────────────────────

TTS_LABEL="disabled"
if [ "$TTS" = "true" ]; then TTS_LABEL="enabled"; fi

VISUALS_LABEL="disabled"
if [ -n "$GOOGLE_API_KEY" ]; then VISUALS_LABEL="enabled"; fi

MODEL_LABEL="Claude Opus (recommended)"
if [ "$MODEL" = "sonnet" ]; then MODEL_LABEL="Claude Sonnet"; fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉  All done!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║                                              ║"
echo "║   ✅  AgentDash installed successfully!      ║"
echo "║                                              ║"
printf "║   📂  App:     %-29s║\n" "$INSTALL_PATH"
printf "║   🧠  Model:   %-29s║\n" "$MODEL_LABEL"
printf "║   🔊  TTS:     %-29s║\n" "$TTS_LABEL"
printf "║   🍌  Visuals: %-29s║\n" "$VISUALS_LABEL"
printf "║   🌐  Port:    %-29s║\n" "$PORT"
echo "║   🔧  CLI:     ~/.agentdash/bin/agentdash   ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  To start AgentDash:"
echo ""
echo "    👉  agentdash"
echo ""
echo "  If you just added it to your PATH, first run:"
echo ""
echo "    source $SHELL_RC"
echo ""
