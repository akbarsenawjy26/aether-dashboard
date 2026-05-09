"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

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
  Menu,
  Sun,
  Moon,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/stores/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const { setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Dashboard", "Master Data"]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "User";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  if (!mounted) return null;

  return (
    <>
      {/* Mobile Header - Logo + Hamburger */}
      <div className="flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden [padding-top:env(safe-area-inset-top)]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Radio className="h-5 w-5" />
          </div>
          <span className="font-heading text-base font-bold tracking-tight">Aether</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-muted-foreground"
          >
            {mounted && (resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            ))}
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger className="h-9 w-9 inline-flex items-center justify-center rounded-md px-0 py-0 bg-transparent hover:bg-accent/50 outline-none">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0 bg-[#1a1a1a] border-white/5 flex flex-col text-white">
            <div className="flex h-16 items-center border-b border-white/10 px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Radio className="h-5 w-5" />
                </div>
                <span className="font-heading text-lg font-bold text-white">
                  Aether Node
                </span>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
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
                        <div className="ml-3 pl-4 border-l border-white/10 mt-1 space-y-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href!}
                              onClick={() => setIsOpen(false)}
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
                      onClick={() => setIsOpen(false)}
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
            <div className="border-t border-white/10 p-4 mt-auto">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-all duration-200 hover:bg-white/5 group border-none bg-transparent cursor-pointer outline-none">
                  <Avatar className="h-10 w-10 border-2 border-white/10 transition-colors group-hover:border-primary/50">
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-sm font-bold text-white">
                      {fullName}
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
                        <p className="text-sm font-medium leading-none text-white">{fullName}</p>
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
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* Bottom Tab Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-16 items-center justify-around">
          <Link
            href="/dashboard/realtime"
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors min-w-[60px]",
              isActive("/dashboard/realtime") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Radio className="h-5 w-5" />
            <span className="text-[10px]">Realtime</span>
          </Link>
          <Link
            href="/dashboard/history"
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors min-w-[60px]",
              isActive("/dashboard/history") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <History className="h-5 w-5" />
            <span className="text-[10px]">History</span>
          </Link>
          <Link
            href="/dashboard/alarms"
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors min-w-[60px]",
              isActive("/dashboard/alarms") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Bell className="h-5 w-5" />
            <span className="text-[10px]">Alarms</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors min-w-[60px] border-none bg-transparent outline-none cursor-pointer",
                isActive("/master-data") ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Anchor className="h-5 w-5" />
              <span className="text-[10px]">Master</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 mb-2 bg-[#252525] border-white/10 text-white shadow-2xl">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-white/40 px-3 py-2">Master Data</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                {navItems[1].children?.map((child) => (
                  <DropdownMenuItem key={child.href} className="focus:bg-primary focus:text-white cursor-pointer py-0 px-0">
                    <Link 
                      href={child.href!} 
                      className="flex items-center gap-3 w-full px-3 py-2.5"
                      onClick={() => {}}
                    >
                      <span className="text-white/70 group-focus:text-white">{child.icon}</span>
                      <span className="font-medium">{child.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </>
  );
}