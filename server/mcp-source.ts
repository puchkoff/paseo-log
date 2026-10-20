// The plugin subprocess has no path to its own files, so the stdio MCP script ships as a string
// and is written to disk at startup (see index.server.ts). No backticks or `${` allowed inside.
export const MCP_SOURCE = String.raw`// Stdio MCP server, spawned per agent session. Zero dependencies: plain JSON-RPC over newline-delimited stdin/stdout.
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

const file = process.env.PASEO_LOG_FILE;
const LEVELS = ["info", "success", "warning", "error"];

const tool = {
  name: "log",
  description:
    "Write a message to the user's Log screen in Paseo. Use it for things the user should read later: " +
    "a finished result, a decision that needs them, a blocker, a surprise. Newest entries show on top.",
  inputSchema: {
    type: "object",
    properties: {
      message: { type: "string", description: "The message. Plain text, may be multi-line." },
      title: { type: "string", description: "Optional short headline." },
      level: { type: "string", enum: LEVELS, description: "Defaults to info." },
    },
    required: ["message"],
  },
};

function call(args) {
  const message = typeof args?.message === "string" ? args.message.trim() : "";
  if (!message) return { isError: true, content: [{ type: "text", text: "message is required" }] };
  const entry = {
    at: new Date().toISOString(),
    level: LEVELS.includes(args.level) ? args.level : "info",
    title: typeof args.title === "string" && args.title.trim() ? args.title.trim() : undefined,
    message,
    agentId: process.env.PASEO_AGENT_ID || undefined,
    cwd: process.env.PASEO_AGENT_CWD || process.cwd(),
  };
  try {
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, JSON.stringify(entry) + "\n");
  } catch (e) {
    return { isError: true, content: [{ type: "text", text: "could not write log: " + e.message }] };
  }
  return { content: [{ type: "text", text: "logged" }] };
}

function handle(msg) {
  switch (msg.method) {
    case "initialize":
      return {
        protocolVersion: msg.params?.protocolVersion ?? "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "paseo-log", version: "1.0.0" },
      };
    case "tools/list":
      return { tools: [tool] };
    case "tools/call":
      return msg.params?.name === tool.name ? call(msg.params.arguments) : { isError: true, content: [{ type: "text", text: "unknown tool" }] };
    case "ping":
      return {};
    default:
      return undefined;
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg.id === undefined) return; // notification
  const result = handle(msg);
  const reply = result === undefined ? { error: { code: -32601, message: "method not found" } } : { result };
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, ...reply }) + "\n");
});
`;
