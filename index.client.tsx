import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { Text, View } from "react-native";
import { LogScreen, useUnread } from "./client/log.tsx";

function LogItem({ theme, currentScreen, openScreen }: PluginSidebarItemProps) {
  const unread = useUnread() ?? 0;
  return (
    <SidebarRow
      icon="ScrollText"
      active={currentScreen?.screenId === "log"}
      onPress={() => openScreen({ screenId: "log" })}
      trailing={unread > 0 ? (
        <View style={{ backgroundColor: theme.colors.accent, borderRadius: 999, paddingHorizontal: 7, marginRight: 8 }}>
          <Text style={{ color: theme.colors.accentForeground, fontSize: 13, fontWeight: "700" }}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      ) : null}
    />
  );
}

export default function contribute(client: PluginClientContext) {
  client.addScreen({ id: "log", title: "Log", Component: LogScreen });
  client.addSidebarHeaderItem({ id: "log", title: "Log", Component: LogItem });
  return () => {};
}
