import { query } from "@anthropic-ai/claude-agent-sdk";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  shouldRegenerateSummary,
  generatePhaseSummary,
  buildMemoryContext,
  findRelevantContext,
} from "./memory.js";
import { createAgentDashMcpServer } from "./mcp-tools.js";

/**
 * If there's a task currently in-progress, returns a short reminder to mark it
 * done when finished. Returns null when there's no active task (all done, or
 * user is just chatting) — no noise in that case.
 */
async function buildTaskStateReminder(projectDir: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(
      path.join(projectDir, ".agentdash", "tasks", "state.json"),
      "utf-8"
    );
    const state = JSON.parse(raw);
    const tasks: { id: string; title: string; status: string }[] = state.tasks || [];
    if (tasks.length === 0) return null;

    const current = state.currentTask
      ? tasks.find((t) => t.id === state.currentTask)
      : null;

    if (!current || current.status !== "in-progress") return null;

    return `Active task: "${current.title}" (${current.id}). When this task is complete, update .agentdash/tasks/state.json — set status to "done", append the commit hash to commits, and set currentTask to null.`;
  } catch {
    return null;
  }
}

/**
 * Lightweight auth check — starts a minimal SDK query, waits for the
 * auth_status message, then aborts before any tokens are consumed.
 */
export async function checkAuth(projectDir: string): Promise<{ ok: boolean; error?: string }> {
  const controller = new AbortController();
  try {
    const stream = query({
      prompt: "Reply with OK",
      options: {
        cwd: projectDir,
        systemPrompt: { type: "preset", preset: "claude_code" },
        maxTurns: 1,
        allowedTools: [],
        ...(controller.signal && { signal: controller.signal }),
      },
    });

    for await (const msg of stream) {
      if (msg.type === "auth_status") {
        const authMsg = msg as any;
        if (authMsg.error) {
          controller.abort();
          return { ok: false, error: authMsg.error };
        }
        // Auth is valid — abort before any model invocation
        controller.abort();
        return { ok: true };
      }
      // If we get a stream_event or assistant msg, auth must be fine — abort
      if (msg.type === "stream_event" || msg.type === "assistant" || msg.type === "result") {
        controller.abort();
        return { ok: true };
      }
    }

    return { ok: true };
  } catch (err) {
    // AbortError is expected when we abort after successful auth check
    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"))) {
      return { ok: true };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const PHASE_SKILLS: Record<string, string> = {
  brainstorm: "/phase-1-brainstorm",
  research: "/phase-2-research",
  architecture: "/phase-3-architecture",
  tasks: "/phase-4-tasks",
  design: "/phase-5-design",
  coding: "/phase-6-coding",
};

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
interface AttachmentPayload {
  name: string;
  data: string; // base64
  mimeType: string;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

async function saveAttachments(attachments: AttachmentPayload[]): Promise<string[]> {
  const tmpDir = path.join(os.tmpdir(), "agentdash-uploads");
  await fs.mkdir(tmpDir, { recursive: true });
  const paths: string[] = [];
  for (const att of attachments) {
    const ext = MIME_TO_EXT[att.mimeType] || ".png";
    const filename = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(tmpDir, filename);
    await fs.writeFile(filePath, Buffer.from(att.data, "base64"));
    paths.push(filePath);
  }
  return paths;
}

export async function* sendPrompt(
  userPrompt: string,
  phase: string,
  projectDir: string,
  onPermissionRequest?: (toolName: string, input: Record<string, unknown>) => Promise<boolean>,
  signal?: AbortSignal,
  attachments?: AttachmentPayload[]
) {
  const skillPrefix = PHASE_SKILLS[phase];
  if (!skillPrefix) throw new Error(`Unknown phase: ${phase}`);

  // For "begin" (phase kick-off) there's no prior history to include.
  // For all follow-up messages, build memory context from summaries + raw tail + BM25 search.
  let fullPrompt: string;
  if (userPrompt.trim() === "begin") {
    fullPrompt = `${skillPrefix} begin`;
  } else {
    // Check if any phase summaries need regeneration (not just current phase)
    try {
      const metaRaw = await fs.readFile(path.join(projectDir, ".agentdash", "meta.json"), "utf-8");
      const meta = JSON.parse(metaRaw);
      const activePhases = Object.entries(meta.phases || {})
        .filter(([, p]: [string, any]) => p.status === "active" || p.status === "completed")
        .map(([name]) => name);

      const staleChecks = await Promise.all(
        activePhases.map(async (p) => ({ phase: p, stale: await shouldRegenerateSummary(projectDir, p) }))
      );
      await Promise.all(
        staleChecks.filter((r) => r.stale).map((r) => generatePhaseSummary(projectDir, r.phase))
      );
    } catch {
      // meta.json unreadable — skip summary regeneration
    }

    const memory = await buildMemoryContext(projectDir, phase);
    const relevant = await findRelevantContext(projectDir, userPrompt);

    const sections: string[] = [skillPrefix];
    if (memory) {
      sections.push(`## Memory\n${memory}`);
    }
    if (relevant) {
      sections.push(`## Relevant past context\n${relevant}`);
    }

    // In coding phase, inject current task state so the agent knows what to update
    if (phase === "coding") {
      const taskStateReminder = await buildTaskStateReminder(projectDir);
      if (taskStateReminder) {
        sections.push(taskStateReminder);
      }
    }

    sections.push(`## User's message\n${userPrompt}`);

    // In coding phase, append output discipline reminder so it's the last thing
    // the model sees before generating. This dramatically reduces narration.
    if (phase === "coding") {
      sections.push(
        `## Output reminder\nDo NOT narrate your process. No "Let me...", "Now I'll...", "Looking at...", "I see...", "First,...". Work silently — only output task-start, task-done, questions, and blockers. Suppress ALL other text.`
      );
    }

    fullPrompt = sections.join("\n\n");
  }

  // Save attachments to temp files and append read instructions to the prompt
  if (attachments && attachments.length > 0) {
    const filePaths = await saveAttachments(attachments);
    const readInstructions = filePaths
      .map((p) => `Read and analyze this screenshot: ${p}`)
      .join("\n");
    fullPrompt += `\n\n## Attached screenshots\n${readInstructions}`;
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
    const mcpServer = createAgentDashMcpServer(projectDir);
    const stream = query({
      prompt: fullPrompt,
      options: {
        cwd: projectDir,
        systemPrompt: { type: "preset", preset: "claude_code" },
        settingSources: ["project"],
        includePartialMessages: true,
        allowedTools: ["Skill", "Read", "Write", "Bash", "Grep", "Glob"],
        mcpServers: {
          "agentdash-tools": mcpServer,
          "playwright": {
            type: "stdio" as const,
            command: "npx",
            args: ["@playwright/mcp@latest"],
          },
        },
        ...(canUseTool && { canUseTool }),
        ...(signal && { signal }),
      },
    });

    let receivedChunks = false;
    for await (const msg of stream) {
      if (msg.type === "auth_status") {
        const authMsg = msg as any;
        if (authMsg.error) {
          yield { type: "auth_error" as const, message: authMsg.error };
          return;
        }
      } else if (msg.type === "stream_event") {
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
        const assistantMsg = msg as any;
        if (assistantMsg.error === "authentication_failed") {
          yield { type: "auth_error" as const, message: "Authentication expired" };
          return;
        }
        // Full message — extract complete text for clients that missed streaming
        const text = assistantMsg.message?.content
          ?.filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("");
        if (text) {
          yield { type: "assistant_message" as const, content: text };
        }
      } else if (msg.type === "tool_progress") {
        const tp = msg as any;
        yield {
          type: "tool_activity" as const,
          toolName: tp.tool_name as string,
          elapsedSeconds: tp.elapsed_time_seconds as number,
        };
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
      if (msg.type === "auth_status") {
        const authMsg = msg as any;
        if (authMsg.error) {
          yield { type: "auth_error" as const, message: authMsg.error };
          return;
        }
      } else if (msg.type === "stream_event") {
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
        const assistantMsg = msg as any;
        if (assistantMsg.error === "authentication_failed") {
          yield { type: "auth_error" as const, message: "Authentication expired" };
          return;
        }
        const text = assistantMsg.message?.content
          ?.filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("");
        if (text) {
          yield { type: "assistant_message" as const, content: text };
        }
      } else if (msg.type === "tool_progress") {
        const tp = msg as any;
        yield {
          type: "tool_activity" as const,
          toolName: tp.tool_name as string,
          elapsedSeconds: tp.elapsed_time_seconds as number,
        };
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
      if (msg.type === "auth_status") {
        const authMsg = msg as any;
        if (authMsg.error) {
          yield { type: "auth_error" as const, message: authMsg.error };
          return;
        }
      } else if (msg.type === "stream_event") {
        const event = (msg as any).event;
        if (
          event?.type === "content_block_delta" &&
          event?.delta?.type === "text_delta" &&
          event.delta.text
        ) {
          yield { type: "response_chunk" as const, content: event.delta.text };
        }
      } else if (msg.type === "assistant") {
        const assistantMsg = msg as any;
        if (assistantMsg.error === "authentication_failed") {
          yield { type: "auth_error" as const, message: "Authentication expired" };
          return;
        }
      } else if (msg.type === "tool_progress") {
        const tp = msg as any;
        yield {
          type: "tool_activity" as const,
          toolName: tp.tool_name as string,
          elapsedSeconds: tp.elapsed_time_seconds as number,
        };
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
