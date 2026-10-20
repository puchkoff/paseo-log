import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { MCP_SOURCE } from "./server/mcp-source.ts";
import { LOG_FILE, MCP_FILE, readNewest } from "./server/store.ts";
import { listLog, readState } from "./shared/log.ts";

// Every new agent gets a `log` tool (mcp__log__log) that appends to LOG_FILE; the Log screen reads it back.
export default function contribute(server: PluginServerContext) {
  mkdirSync(dirname(MCP_FILE), { recursive: true });
  writeFileSync(MCP_FILE, MCP_SOURCE); // rewritten on every load, so a plugin update reaches new agents
  server.registerSettings(readState); // the document must be registered here before the client can read or save it
  server.handle(listLog, async ({ limit }) => ({ entries: await readNewest(limit) }));
  server.before("agent.create", ({ request }) => ({
    ...request,
    config: {
      ...request.config,
      mcpServers: {
        ...request.config.mcpServers,
        log: { type: "stdio", command: process.execPath, args: [MCP_FILE], env: { PASEO_LOG_FILE: LOG_FILE } },
      },
      toolPolicy: { preapproved: [...(request.config.toolPolicy?.preapproved ?? []), ...["log", "read_log", "delete_log"].map((tool) => ({ kind: "mcp" as const, server: "log", tool }))] },
    },
  }));
  return () => {};
}
