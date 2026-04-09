"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Home, CalendarPlus, BarChart3, Plus, MessageSquare, Trash2, History } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useBKAgent } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/tao-ke-hoach", label: "Tạo kế hoạch", icon: CalendarPlus },
  { href: "/chi-so", label: "Bảng chỉ số", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [historyOpen, setHistoryOpen] = useState(true);
  const { sessions, currentSessionId, newSession, loadSession, deleteSession } = useBKAgent();

  function handleNewChat() {
    newSession();
    router.push("/tao-ke-hoach");
  }

  function handleLoadSession(id: string) {
    loadSession(id);
    router.push("/tao-ke-hoach");
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="p-3">
        <div className="flex items-center justify-between gap-1">
          <Link href="/" className="flex items-center gap-2.5 px-1 min-w-0">
            <Image src="/hust-logo.svg" alt="HUST" width={19} height={28} className="shrink-0" />
            <span className="text-base font-bold tracking-tight text-white group-data-[collapsible=icon]:hidden truncate">
              BKAgent
            </span>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            title="Tạo chat mới"
            className="size-7 shrink-0 text-white/80 hover:text-white hover:bg-white/15 group-data-[collapsible=icon]:hidden"
            onClick={handleNewChat}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chat history section */}
        {sessions.length > 0 && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors">
                <History className="size-3.5" />
                <span>Lịch sử</span>
                <span className="ml-auto text-white/50">{sessions.length}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 space-y-0.5 px-1">
                  {sessions.slice(0, 8).map((session) => (
                    <div
                      key={session.id}
                      className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                        session.id === currentSessionId
                          ? "bg-white/20 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                      onClick={() => handleLoadSession(session.id)}
                    >
                      <MessageSquare className="size-3 shrink-0" />
                      <span className="flex-1 truncate text-xs leading-tight">{session.title}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        title="Xóa phiên"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>

      <div className="border-t border-white/20 p-3">
        {mounted && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-white/80 group-data-[collapsible=icon]:hidden">
              Dark
            </span>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        )}
      </div>
    </Sidebar>
  );
}
