import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseNewest } from "../shared/log.ts";

// Per OS user, so each daemon (puchkoff, oleg) keeps its own log.
export const LOG_FILE = join(homedir(), ".paseo-log", "log.jsonl");

export async function readNewest(limit: number) {
  const raw = await readFile(LOG_FILE, "utf8").catch((e: NodeJS.ErrnoException) => {
    if (e.code === "ENOENT") return "";
    throw e;
  });
  return parseNewest(raw, limit);
}
