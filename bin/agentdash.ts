#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AgentDashConfig {
  tts?: boolean;
  port?: number;
  installPath?: string;
}

const CONFIG_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".agentdash",
  "config.json"
);

function readConfig(): AgentDashConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(config: AgentDashConfig) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

function printHelp() {
  console.log(`
AgentDash — AI-powered product development dashboard

Usage:
  agentdash                  Start the server (default port: 3141)
  agentdash --port <number>  Start on a specific port
  agentdash --tts on|off     Enable or disable text-to-speech
  agentdash --help           Show this help message

Configuration is stored in ~/.agentdash/config.json
`.trim());
}

function openBrowser(url: string) {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

// --- Argument parsing ---

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const config = readConfig();

// Handle --tts on|off
const ttsIdx = args.indexOf("--tts");
if (ttsIdx !== -1) {
  const val = args[ttsIdx + 1];
  if (val === "on" || val === "off") {
    config.tts = val === "on";
    writeConfig(config);
    console.log(`TTS ${config.tts ? "enabled" : "disabled"}.`);
    // If --tts is the only flag, just update and exit
    if (args.length === 2) process.exit(0);
  } else {
    console.error('Usage: agentdash --tts on|off');
    process.exit(1);
  }
}

// Handle --port
const portIdx = args.indexOf("--port");
let port = config.port || 3141;
if (portIdx !== -1) {
  const p = parseInt(args[portIdx + 1], 10);
  if (isNaN(p) || p < 1 || p > 65535) {
    console.error("Invalid port number. Must be between 1 and 65535.");
    process.exit(1);
  }
  port = p;
}

// --- Start the server ---

// Determine project root from config or by resolving from this script's location
const projectRoot = config.installPath || path.resolve(__dirname, "..");

// Set environment variables for the server
process.env.PORT = String(port);
process.env.AGENTDASH_CONFIG = CONFIG_PATH;
process.env.AGENTDASH_ROOT = projectRoot;

console.log(`Starting AgentDash on http://localhost:${port} ...`);

// Import and start the server (compiled output lives in dist-server/)
const serverPath = path.join(projectRoot, "dist-server", "server", "index.js");
if (!fs.existsSync(serverPath)) {
  // Fallback: try running from source with tsx (dev mode)
  const srcPath = path.join(projectRoot, "server", "index.ts");
  if (fs.existsSync(srcPath)) {
    console.log("(running from source — use npm run build for production)");
    import(srcPath).then(() => {
      openBrowser(`http://localhost:${port}`);
    });
  } else {
    console.error(
      "Error: Could not find AgentDash server files.\n" +
      "Run `npm run build` in the AgentDash directory first."
    );
    process.exit(1);
  }
} else {
  import(serverPath).then(() => {
    openBrowser(`http://localhost:${port}`);
  });
}
