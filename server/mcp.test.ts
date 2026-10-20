import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parseNewest } from "../shared/log.ts";
import { MCP_SOURCE } from "./mcp-source.ts";

test("mcp script lists the tool and appends a valid entry", () => {
  const dir = mkdtempSync(join(tmpdir(), "paseo-log-"));
  const script = join(dir, "mcp.mjs");
  const file = join(dir, "sub", "log.jsonl");
  writeFileSync(script, MCP_SOURCE);
  const input = [
    { jsonrpc: "2.0", id: 1, method: "tools/list" },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "log", arguments: { message: "hi", level: "warning" } } },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "log", arguments: {} } },
  ].map((m) => JSON.stringify(m)).join("\n");
  const out = spawnSync(process.execPath, [script], { input, env: { ...process.env, PASEO_LOG_FILE: file }, encoding: "utf8" });
  const replies = out.stdout.trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(replies[0].result.tools[0].name, "log");
  assert.equal(replies[2].result.isError, true);
  const [entry] = parseNewest(readFileSync(file, "utf8"), 5);
  assert.deepEqual([entry.message, entry.level], ["hi", "warning"]);
});
