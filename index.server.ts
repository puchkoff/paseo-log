import { fileURLToPath } from "node:url";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { listLog } from "./shared/log.ts";
import { LOG_FILE, readNewest } from "./server/store.ts";

const MCP_SCRIPT = fileURLToPath(new URL("./server/mcp.mjs", import.meta.url));

// Every new agent gets a `log` tool (mcp__log__log) that appends to LOG_FILE; the Log screen reads it back.
export default function contribute(server: PluginServerContext) {
  server.handle(listLog, async ({ limit }) => ({ entries: await readNewest(limit) }));
  server.before("agent.create", ({ request }) => ({
    ...request,
    config: {
      ...request.config,
      mcpServers: {
        ...request.config.mcpServers,
        log: { type: "stdio", command: process.execPath, args: [MCP_SCRIPT], env: { PASEO_LOG_FILE: LOG_FILE } },
      },
      toolPolicy: { preapproved: [...(request.config.toolPolicy?.preapproved ?? []), { kind: "mcp", server: "log", tool: "log" }] },
    },
  }));
  return () => {};
}
