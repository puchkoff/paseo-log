import assert from "node:assert/strict";
import { test } from "node:test";
import { parseNewest } from "./log.ts";

const line = (message: string) => JSON.stringify({ at: "2026-10-20T00:00:00Z", level: "info", message });

test("newest first, limited, bad lines skipped", () => {
  const raw = [line("a"), "{torn", line("b"), line("c"), ""].join("\n");
  assert.deepEqual(parseNewest(raw, 2).map((e) => e.message), ["c", "b"]);
  assert.deepEqual(parseNewest(raw, 10).map((e) => e.message), ["c", "b", "a"]);
});
