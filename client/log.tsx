import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { ScrollView } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { type Entry, listLog } from "../shared/log.ts";

const FS = { title: 29, body: 19, small: 17, tiny: 15 };

function ago(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  return min < 1440 ? `${Math.floor(min / 60)} h ago` : new Date(iso).toLocaleString();
}

export function useLog() {
  const list = useRpc(listLog);
  return useQuery({ queryKey: ["paseo-log"], queryFn: () => list({ limit: 200 }), refetchInterval: 5000 });
}

export function LogScreen({ theme, layout, host, navigation }: PluginScreenProps) {
  const c = theme.colors;
  const { data, error } = useLog();
  const color = { info: c.accent, success: c.statusSuccess, warning: c.statusWarning, error: c.statusDanger } as const;

  const card = (e: Entry, i: number) => (
    <View key={`${e.at}-${i}`} style={{ backgroundColor: c.surface1, borderColor: c.border, borderWidth: 1, borderLeftColor: color[e.level], borderLeftWidth: 4, borderRadius: 10, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {e.title ? <Text style={{ color: c.foreground, fontSize: FS.body, fontWeight: "600", flexShrink: 1 }}>{e.title}</Text> : null}
        <Text style={{ color: c.foregroundMuted, fontSize: FS.tiny, flex: 1 }} numberOfLines={1}>
          {[e.cwd?.split("/").slice(-2).join("/"), ago(e.at)].filter(Boolean).join(" · ")}
        </Text>
        {e.agentId && navigation ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open agent" onPress={() => navigation.openAgent({ agentId: e.agentId!, serverId: host.id })}>
            <Text style={{ color: c.accent, fontSize: FS.tiny }}>Open agent</Text>
          </Pressable>
        ) : null}
      </View>
      <Text selectable style={{ color: c.foreground, fontSize: FS.small }}>{e.message}</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.surface0 }} contentContainerStyle={{ padding: layout.compact ? 16 : 24, gap: 12, maxWidth: 860, width: "100%", alignSelf: "center" }}>
      <Text style={{ color: c.foreground, fontSize: FS.title, fontWeight: "600" }}>Log</Text>
      {error ? <Text style={{ color: c.statusWarning, fontSize: FS.small }}>Could not load: {String(error)}</Text> : null}
      {data && data.entries.length === 0 ? (
        <Text style={{ color: c.foregroundMuted, textAlign: "center", fontSize: FS.body, paddingVertical: 60 }}>Nothing logged yet. Agents started from now on have a `log` tool.</Text>
      ) : null}
      {data?.entries.map(card)}
    </ScrollView>
  );
}
