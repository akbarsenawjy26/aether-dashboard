"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Bell, ChevronRight, Home } from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";
import { useAlarmStore } from "@/lib/stores/alarmStore";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Header() {
  const { setTheme, resolvedTheme } = useTheme();
  const { user } = useAuthStore();
  const unreadCount = useAlarmStore((s) => s.unreadCount);
  const markAllAsRead = useAlarmStore((s) => s.markAllAsRead);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const pathname = usePathname();
  
  const breadcrumbs = pathname
    .split("/")
    .filter((path) => path && path !== "dashboard" && path !== "master-data")
    .map((path) => {
      return {
        label: path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " "),
        href: pathname.split(path)[0] + path,
      };
    });

  const parentLabel = pathname.includes("dashboard") 
    ? "Dashboard" 
    : pathname.includes("master-data") 
    ? "Master Data" 
    : null;

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "User";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-16 items-center justify-between rounded-3xl bg-card px-6 shadow-md border-none transition-all duration-300">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        <Link 
          href="/dashboard/realtime" 
          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <Home className="h-4 w-4" />
        </Link>
        
        {parentLabel && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            <span className="text-muted-foreground/70 font-medium">{parentLabel}</span>
          </>
        )}

        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.href} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            <Link
              href={crumb.href}
              className={cn(
                "transition-colors hover:text-primary",
                i === breadcrumbs.length - 1
                  ? "text-foreground font-bold"
                  : "text-muted-foreground"
              )}
            >
              {crumb.label}
            </Link>
          </div>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Link href="/dashboard/alarms" onClick={() => markAllAsRead()}>
          <Button variant="ghost" size="icon" className="h-9 w-9 relative hover:bg-muted transition-all rounded-full group">
            <Bell className={cn(
              "h-4 w-4 transition-transform group-hover:rotate-12",
              unreadCount > 0 && "text-red-500 fill-red-500/10"
            )} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-card animate-in zoom-in duration-300">
                {unreadCount}
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}