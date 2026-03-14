import fs from "fs";
import path from "path";

export interface AgentDashConfig {
  tts?: boolean;
  port?: number;
  host?: string;
  installPath?: string;
  googleApiKey?: string;
  model?: "opus" | "sonnet";
}

const configPath = process.env.AGENTDASH_CONFIG || path.join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".agentdash",
  "config.json"
);

let config: AgentDashConfig = {};
try {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch {
  // No config file — use defaults
}

export const userConfig: AgentDashConfig = config;
