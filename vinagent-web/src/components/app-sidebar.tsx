"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, CalendarPlus, BarChart3 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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
import { Switch } from "@/components/ui/switch";

const NAV_ITEMS = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/tao-ke-hoach", label: "Tạo kế hoạch", icon: CalendarPlus },
  { href: "/chi-so", label: "Bảng chỉ số", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="p-3">
        <Link href="/" className="flex items-center gap-2.5 px-1">
          <Image
            src="/hust-logo.svg"
            alt="HUST"
            width={19}
            height={28}
            className="shrink-0"
          />
          <span className="text-base font-bold tracking-tight text-white group-data-[collapsible=icon]:hidden">
            BKAgent
          </span>
        </Link>
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
      </SidebarContent>

      <div className="border-t border-white/20 p-3">
        {mounted && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-white/80 group-data-[collapsible=icon]:hidden">Dark</span>
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
