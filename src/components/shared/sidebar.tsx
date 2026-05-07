"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  History,
  Users,
  HardDrive,
  MapPin,
  Anchor,
  Key,
  LogOut,
  ChevronDown,
  ChevronRight,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/stores/authStore";

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
      {
        label: "Alarms",
        href: "/dashboard/alarms",
        icon: <Bell className="h-4 w-4" />,
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
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Dashboard", "Master Data"]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = user?.name 
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) 
    : "U";

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <aside className="flex h-full w-72 flex-col p-4 bg-background">
        <div className="flex h-full w-full flex-col rounded-3xl bg-[#323232] shadow-xl border-none" />
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-72 flex-col p-4 bg-background transition-all duration-300">
      <div className="flex h-full w-full flex-col rounded-3xl bg-[#323232] shadow-xl border-none overflow-hidden transition-all duration-300">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Radio className="h-5 w-5" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight text-white">
              Aether Node
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {navItems.map((item) => (
            <div key={item.label} className="mb-1">
              {item.children ? (
                <div className="space-y-1">
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                      "hover:bg-white/5",
                      expandedItems.includes(item.label)
                        ? "text-white bg-white/10"
                        : "text-white/60 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </div>
                    {expandedItems.includes(item.label) ? (
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    ) : (
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    )}
                  </button>
                  {expandedItems.includes(item.label) && (
                    <div className="ml-3 pl-4 border-l border-white/10 mt-1 space-y-1 animate-in fade-in slide-in-from-left-2 duration-200">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href!}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                            isActive(child.href!)
                              ? "bg-primary text-white shadow-lg shadow-primary/30 font-medium"
                              : "text-white/50 hover:text-white hover:bg-white/5"
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
                    "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                    isActive(item.href!)
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* User Profile Card */}
        <div className="border-t border-white/10 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-all duration-200 hover:bg-white/5 group border-none bg-transparent cursor-pointer outline-none">
              <Avatar className="h-10 w-10 border-2 border-white/10 transition-colors group-hover:border-primary/50">
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-bold text-white">
                  {user?.name ?? "User"}
                </span>
                <span className="truncate text-[10px] text-white/40">
                  {user?.email ?? "user@example.com"}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56 mb-4 ml-2 bg-[#252525] border-white/10 text-white shadow-2xl z-50 p-1">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal px-2 py-2 border-b border-white/5 mb-1">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white">{user?.name}</p>
                    <p className="text-xs leading-none text-white/50">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-white/5 mx-1 my-1" />
              <DropdownMenuItem 
                className="focus:bg-red-500/10 focus:text-red-400 text-red-400 cursor-pointer flex items-center gap-2 py-2.5 px-2 rounded-md"
                onClick={() => {
                  localStorage.removeItem("access_token");
                  localStorage.removeItem("refresh_token");
                  window.location.href = "/login";
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}