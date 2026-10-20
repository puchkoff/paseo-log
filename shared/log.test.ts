import assert from "node:assert/strict";
import { test } from "node:test";
import { parseNewest, unreadCount } from "./log.ts";

const line = (message: string) => JSON.stringify({ at: "2026-10-20T00:00:00Z", level: "info", message });

test("newest first, limited, bad lines skipped", () => {
  const raw = [line("a"), "{torn", line("b"), line("c"), ""].join("\n");
  assert.deepEqual(parseNewest(raw, 2).map((e) => e.message), ["c", "b"]);
  assert.deepEqual(parseNewest(raw, 10).map((e) => e.message), ["c", "b", "a"]);
});

test("unread counts entries newer than seenAt", () => {
  const e = (at: string) => ({ at, level: "info" as const, message: "m" });
  const all = [e("2026-10-20T03:00:00Z"), e("2026-10-20T02:00:00Z"), e("2026-10-20T01:00:00Z")];
  assert.equal(unreadCount(all, ""), 3);
  assert.equal(unreadCount(all, "2026-10-20T02:00:00Z"), 1);
  assert.equal(unreadCount(all, "2026-10-20T03:00:00Z"), 0);
});
