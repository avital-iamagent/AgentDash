import { query } from "@anthropic-ai/claude-agent-sdk";
import fs from "fs/promises";
import path from "path";

const PHASE_SKILLS: Record<string, string> = {
  brainstorm: "/phase-1-brainstorm",
  research: "/phase-2-research",
  architecture: "/phase-3-architecture",
  environment: "/phase-4-environment",
  tasks: "/phase-5-tasks",
};

/**
 * Reads the last N conversation turns for a phase from history.json.
 * Returns a formatted string, or empty string if no history.
 */
/**
 * Returns the last 1 full exchange (user + assistant) for a phase.
 * Enough context to avoid re-introduction without altering Claude's behavior.
 */
async function readPhaseHistory(projectDir: string, phase: string): Promise<string> {
  try {
    const raw = await fs.readFile(path.join(projectDir, ".agentdash", "history.json"), "utf-8");
    const entries: { role: string; content: string; phase: string }[] = JSON.parse(raw);
    const phaseEntries = entries.filter((e) => e.phase === phase).slice(-4); // last 2 exchanges
    if (phaseEntries.length === 0) return "";
    return phaseEntries
      .map((e) => {
        const role = e.role === "user" ? "User" : "Assistant";
        // Keep assistant summaries short to avoid overwhelming the context
        const limit = e.role === "assistant" ? 400 : 600;
        const content = e.content.length > limit ? e.content.slice(0, limit) + "…" : e.content;
        return `${role}: ${content}`;
      })
      .join("\n\n");
  } catch {
    return "";
  }
}

/**
 * Streams a prompt through Claude Code with the appropriate phase skill.
 *
 * SDK message types (verified via spike):
 * - system (subtype: init) — session info
 * - stream_event — partial streaming deltas (when includePartialMessages: true)
 *   - event.type: message_start | content_block_start | content_block_delta | content_block_stop | message_stop
 *   - text deltas: event.delta.text when event.type === "content_block_delta" && event.delta.type === "text_delta"
 * - assistant — full assembled message at msg.message.content[] (text/tool_use/thinking blocks)
 * - result — final summary with subtype, cost, duration, turn count
 * - tool_progress — long-running tool updates
 */
export async function* sendPrompt(
  userPrompt: string,
  phase: string,
  projectDir: string,
  onPermissionRequest?: (toolName: string, input: Record<string, unknown>) => Promise<boolean>,
  signal?: AbortSignal
) {
  const skillPrefix = PHASE_SKILLS[phase];
  if (!skillPrefix) throw new Error(`Unknown phase: ${phase}`);

  // For "begin" (phase kick-off) there's no prior history to include.
  // For all follow-up messages, prepend the recent conversation so Claude
  // doesn't re-read state or re-introduce itself on every turn.
  let fullPrompt: string;
  if (userPrompt.trim() === "begin") {
    fullPrompt = `${skillPrefix} begin`;
  } else {
    const history = await readPhaseHistory(projectDir, phase);
    if (history) {
      fullPrompt = `${skillPrefix}

## Conversation so far
${history}

## User's message
${userPrompt}`;
    } else {
      fullPrompt = `${skillPrefix} ${userPrompt}`;
    }
  }

  const canUseTool = onPermissionRequest
    ? async (toolName: string, input: Record<string, unknown>) => {
        const allowed = await onPermissionRequest(toolName, input);
        return allowed
          ? { behavior: "allow" as const, updatedInput: input }
          : { behavior: "deny" as const, message: "Permission denied by user" };
      }
    : undefined;

  try {
    const stream = query({
      prompt: fullPrompt,
      options: {
        cwd: projectDir,
        systemPrompt: { type: "preset", preset: "claude_code" },
        settingSources: ["project"],
        includePartialMessages: true,
        allowedTools: ["Skill", "Read", "Write", "Bash", "Grep", "Glob"],
        ...(canUseTool && { canUseTool }),
        ...(signal && { signal }),
      },
    });

    let receivedChunks = false;
    for await (const msg of stream) {
      if (msg.type === "stream_event") {
        const event = (msg as any).event;
        if (
          event?.type === "content_block_delta" &&
          event?.delta?.type === "text_delta" &&
          event.delta.text
        ) {
          receivedChunks = true;
          yield { type: "response_chunk" as const, content: event.delta.text };
        }
      } else if (msg.type === "assistant") {
        // Full message — extract complete text for clients that missed streaming
        const text = (msg as any).message?.content
          ?.filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("");
        if (text) {
          yield { type: "assistant_message" as const, content: text };
        }
      } else if (msg.type === "result") {
        const result = msg as any;
        // Only use result.result as fallback when no streaming chunks were received
        if (!receivedChunks && typeof result.result === "string" && result.result) {
          yield { type: "response_chunk" as const, content: result.result };
        }
        yield {
          type: "response_done" as const,
          subtype: result.subtype,
          isError: result.is_error,
          numTurns: result.num_turns,
          costUsd: result.total_cost_usd,
          result: result.result || null,
          errors: result.errors || [],
        };
      }
    }
  } catch (err) {
    yield {
      type: "error" as const,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function* runResearch(
  question: string,
  projectDir: string
) {
  try {
    const stream = query({
      prompt: `/research-assistant ${question}`,
      options: {
        cwd: projectDir,
        systemPrompt: { type: "preset", preset: "claude_code" },
        settingSources: ["project"],
        includePartialMessages: true,
        allowedTools: [
          "Skill", "Read", "Write", "Bash", "Grep", "Glob",
          "WebSearch", "WebFetch",
        ],
      },
    });

    let receivedChunks = false;
    for await (const msg of stream) {
      if (msg.type === "stream_event") {
        const event = (msg as any).event;
        if (
          event?.type === "content_block_delta" &&
          event?.delta?.type === "text_delta" &&
          event.delta.text
        ) {
          receivedChunks = true;
          yield { type: "response_chunk" as const, content: event.delta.text };
        }
      } else if (msg.type === "assistant") {
        const text = (msg as any).message?.content
          ?.filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("");
        if (text) {
          yield { type: "assistant_message" as const, content: text };
        }
      } else if (msg.type === "result") {
        const result = msg as any;
        // Only use result.result as fallback when no streaming chunks were received
        if (!receivedChunks && typeof result.result === "string" && result.result) {
          yield { type: "response_chunk" as const, content: result.result };
        }
        yield {
          type: "response_done" as const,
          subtype: result.subtype,
          isError: result.is_error,
          costUsd: result.total_cost_usd,
          result: result.result || null,
          errors: result.errors || [],
        };
      }
    }
  } catch (err) {
    yield {
      type: "error" as const,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function* runReview(
  phase: string,
  projectDir: string
) {
  try {
    const stream = query({
      prompt: `/phase-review ${phase}`,
      options: {
        cwd: projectDir,
        systemPrompt: { type: "preset", preset: "claude_code" },
        settingSources: ["project"],
        includePartialMessages: true,
        allowedTools: ["Skill", "Read", "Grep", "Glob"],
      },
    });

    for await (const msg of stream) {
      if (msg.type === "stream_event") {
        const event = (msg as any).event;
        if (
          event?.type === "content_block_delta" &&
          event?.delta?.type === "text_delta" &&
          event.delta.text
        ) {
          yield { type: "response_chunk" as const, content: event.delta.text };
        }
      } else if (msg.type === "result") {
        const result = msg as any;
        yield {
          type: "response_done" as const,
          subtype: result.subtype,
          isError: result.is_error,
          costUsd: result.total_cost_usd,
          result: result.result || null,
          errors: result.errors || [],
        };
      }
    }
  } catch (err) {
    yield {
      type: "error" as const,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
