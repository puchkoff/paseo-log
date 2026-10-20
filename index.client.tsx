import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { LogScreen } from "./client/log.tsx";

function LogItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return <SidebarRow icon="ScrollText" active={currentScreen?.screenId === "log"} onPress={() => openScreen({ screenId: "log" })} />;
}

export default function contribute(client: PluginClientContext) {
  client.addScreen({ id: "log", title: "Log", Component: LogScreen });
  client.addSidebarHeaderItem({ id: "log", title: "Log", Component: LogItem });
  return () => {};
}
