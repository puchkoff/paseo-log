// The plugin subprocess has no path to its own files, so the stdio MCP script ships as a string
// and is written to disk at startup (see index.server.ts). No backticks or `${` allowed inside.
export const MCP_SOURCE = String.raw`// Stdio MCP server, spawned per agent session. Zero dependencies: plain JSON-RPC over newline-delimited stdin/stdout.
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

const file = process.env.PASEO_LOG_FILE;
const LEVELS = ["info", "success", "warning", "error"];

const writeTool = {
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

const readTool = {
  name: "read_log",
  description:
    "Read the latest entries of the user's Log, newest first. Each entry has an id (use it with delete_log), time, level, title and message.",
  inputSchema: {
    type: "object",
    properties: { limit: { type: "integer", minimum: 1, maximum: 100, description: "How many entries. Defaults to 10." } },
  },
};

const deleteTool = {
  name: "delete_log",
  description: "Delete entries from the user's Log by id (the id field from read_log). Cannot be undone.",
  inputSchema: {
    type: "object",
    properties: { ids: { type: "array", items: { type: "string" }, minItems: 1, description: "Entry ids to delete." } },
    required: ["ids"],
  },
};

const text = (t, isError) => ({ isError: isError || undefined, content: [{ type: "text", text: t }] });

// The id of an entry is its timestamp. shortcut: two entries written in the same millisecond share an id, so deleting one deletes both.
function readAll() {
  let raw = "";
  try {
    raw = readFileSync(file, "utf8");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  return raw.split("\n").filter(Boolean).flatMap((l) => {
    try {
      const e = JSON.parse(l);
      return typeof e.at === "string" && typeof e.message === "string" ? [{ line: l, entry: e }] : [];
    } catch {
      return [];
    }
  });
}

function read(args) {
  const limit = Number.isInteger(args?.limit) ? Math.min(Math.max(args.limit, 1), 100) : 10;
  const entries = readAll().slice(-limit).reverse().map(({ entry: e }) => ({ id: e.at, level: e.level, title: e.title, message: e.message }));
  return text(entries.length ? JSON.stringify(entries, null, 1) : "The log is empty.");
}

// shortcut: rewrite via temp file + rename; an entry appended by another agent during the rewrite can be lost. Fine for a personal log.
function remove(args) {
  const ids = Array.isArray(args?.ids) ? args.ids.filter((i) => typeof i === "string") : [];
  if (!ids.length) return text("ids is required", true);
  const all = readAll();
  const kept = all.filter(({ entry }) => !ids.includes(entry.at));
  if (kept.length === all.length) return text("no entry matched those ids", true);
  try {
    writeFileSync(file + ".tmp", kept.map((k) => k.line + "\n").join(""));
    renameSync(file + ".tmp", file);
  } catch (e) {
    return text("could not delete: " + e.message, true);
  }
  return text("deleted " + (all.length - kept.length));
}

function write(args) {
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
      return { tools: [writeTool, readTool, deleteTool] };
    case "tools/call": {
      const run = { log: write, read_log: read, delete_log: remove }[msg.params?.name];
      return run ? run(msg.params.arguments) : text("unknown tool", true);
    }
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
