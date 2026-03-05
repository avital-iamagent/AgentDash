import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { autoGenerateVisual, readIndex } from "../routes/visuals.js";

export function createAgentDashMcpServer(projectDir: string) {
  const generateVisual = tool(
    "generate_visual",
    "Generate a UI mockup image from a visual description. " +
      "Provide a detailed description of the UI component (layout, colors, typography, spacing). " +
      "Returns the visual ID and filename.",
    {
      description: z.string().describe("Detailed visual description of the UI component to generate"),
    },
    async ({ description }) => {
      try {
        const id = await autoGenerateVisual(projectDir, description);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ id, filename: `${id}.png` }) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[AgentDash] generate_visual failed:`, message);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
        };
      }
    }
  );

  const listVisuals = tool(
    "list_visuals",
    "List all previously generated visual mockups for this project.",
    {},
    async () => {
      const index = await readIndex(projectDir);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(index) }],
      };
    }
  );

  return createSdkMcpServer({
    name: "agentdash-tools",
    tools: [generateVisual, listVisuals],
  });
}
