"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  History,
  Users,
  HardDrive,
  MapPin,
  Anchor,
  Key,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/lib/stores/themeStore";
import { useState } from "react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    children: [
      {
        label: "Realtime",
        href: "/dashboard/realtime",
        icon: <Radio className="h-4 w-4" />,
      },
      {
        label: "History",
        href: "/dashboard/history",
        icon: <History className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Master Data",
    icon: <Anchor className="h-5 w-5" />,
    children: [
      {
        label: "User",
        href: "/master-data/users",
        icon: <Users className="h-4 w-4" />,
      },
      {
        label: "Device",
        href: "/master-data/devices",
        icon: <HardDrive className="h-4 w-4" />,
      },
      {
        label: "Location",
        href: "/master-data/locations",
        icon: <MapPin className="h-4 w-4" />,
      },
      {
        label: "Installation Point",
        href: "/master-data/installation-points",
        icon: <Anchor className="h-4 w-4" />,
      },
      {
        label: "API Key",
        href: "/master-data/api-keys",
        icon: <Key className="h-4 w-4" />,
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useThemeStore();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Dashboard", "Master Data"]);

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Radio className="h-5 w-5" />
          </div>
          <span className="font-heading text-lg font-semibold tracking-tight">
            Aether Node
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <div>
                <button
                  onClick={() => toggleExpanded(item.label)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    expandedItems.includes(item.label)
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </div>
                  {expandedItems.includes(item.label) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {expandedItems.includes(item.label) && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href!}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          isActive(child.href!)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {child.icon}
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={item.href!}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href!)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.href = "/login";
          }}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}