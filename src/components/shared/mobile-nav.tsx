"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  History,
  Menu,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const mainNavItems: NavItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: <Home className="h-5 w-5" />,
  },
  {
    label: "Realtime",
    href: "/dashboard/realtime",
    icon: <Radio className="h-5 w-5" />,
  },
  {
    label: "History",
    href: "/dashboard/history",
    icon: <History className="h-5 w-5" />,
  },
  {
    label: "Data",
    href: "/master-data/devices",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
];

const masterDataItems: NavItem[] = [
  {
    label: "Users",
    href: "/master-data/users",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Devices",
    href: "/master-data/devices",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Locations",
    href: "/master-data/locations",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Installation Points",
    href: "/master-data/installation-points",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "API Keys",
    href: "/master-data/api-keys",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Mobile Header - Logo + Hamburger */}
      <div className="flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Radio className="h-5 w-5" />
          </div>
          <span className="font-heading text-base font-semibold">Aether</span>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger className="h-9 w-9 inline-flex items-center justify-center rounded-md px-0 py-0 bg-transparent">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex h-14 items-center border-b border-border px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Radio className="h-5 w-5" />
                </div>
                <span className="font-heading text-base font-semibold">
                  Aether Node
                </span>
              </div>
            </div>
            <nav className="p-3 space-y-1">
              <p className="mb-2 px-3 text-xs font-medium uppercase text-muted-foreground">
                Menu
              </p>
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}

              <div className="my-3 h-px bg-border" />

              <p className="mb-2 px-3 text-xs font-medium uppercase text-muted-foreground">
                Master Data
              </p>
              {masterDataItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Bottom Tab Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background lg:hidden">
        <div className="flex h-16 items-center justify-around">
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors min-w-[60px] min-h-[44px]",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.icon}
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}