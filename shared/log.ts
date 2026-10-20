import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const levelSchema = z.enum(["info", "success", "warning", "error"]);

export const entrySchema = z.object({
  at: z.string(),
  level: levelSchema,
  title: z.string().optional(),
  message: z.string(),
  agentId: z.string().optional(),
  cwd: z.string().optional(),
});
export type Entry = z.infer<typeof entrySchema>;

export const listLog = defineRpc({
  name: "log.list",
  input: z.object({ limit: z.number().int().min(1).max(1000).default(200) }),
  output: z.object({ entries: z.array(entrySchema) }),
});

// Newest first. Lines that are not valid entries (torn write, hand edit) are skipped.
export function parseNewest(jsonl: string, limit: number): Entry[] {
  const out: Entry[] = [];
  const lines = jsonl.split("\n");
  for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
    if (!lines[i]) continue;
    try {
      const r = entrySchema.safeParse(JSON.parse(lines[i]));
      if (r.success) out.push(r.data);
    } catch {}
  }
  return out;
}
