"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useUser } from "@clerk/nextjs";
import {
  CreditCard,
  FileText,
  Library,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "New Analysis", icon: Upload },
  { href: "/cases", label: "Cases", icon: FileText },
  { href: "/policy-library", label: "Policy Library", icon: Library },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-white shadow-glow",
        className
      )}
    >
      <ShieldCheck className="h-5 w-5" />
    </span>
  );
}

function PlanBadge({ plan }: { plan?: string | null }) {
  const p = (plan || "free").toString();
  const label = p.toUpperCase();
  return <Badge variant={p === "pro" || p === "enterprise" ? "gold" : "outline"}>{label}</Badge>;
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
              active
                ? "bg-navy text-gold"
                : "text-navy hover:bg-navy/5"
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-gold" : "text-navy/70")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const { user } = useUser();

  const email = user?.primaryEmailAddress?.emailAddress || "";
  const plan = useMemo(() => {
    const p = (user?.publicMetadata as any)?.plan;
    return typeof p === "string" ? p : "free";
  }, [user?.publicMetadata]);

  return (
    <div className="mt-auto space-y-3">
      <Separator />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-navy">{email || "Signed in"}</div>
          <div className="mt-1">
            <PlanBadge plan={plan} />
          </div>
        </div>
        <SignOutButton>
          <Button variant="outline" size="sm" className="shrink-0">
            Sign out
          </Button>
        </SignOutButton>
      </div>
    </div>
  );
}

function DesktopSidebar() {
  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-[260px] md:flex-col md:border-r md:border-border/70 md:bg-white/60 md:backdrop-blur">
      <div className="flex h-16 items-center gap-2 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-navy transition-colors duration-200 hover:text-navy/90">
          <LogoMark />
          <span className="tracking-tight">AirScan</span>
        </Link>
        <Badge className="ml-auto" variant="gold">
          NBC
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-3 pb-4">
        <SidebarNav />
        <SidebarFooter />
      </div>
    </aside>
  );
}

function MobileHeader({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 md:hidden">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-navy transition-colors duration-200 hover:text-navy/90">
          <LogoMark className="h-8 w-8" />
          <span className="tracking-tight">AirScan</span>
        </Link>
        <Button variant="outline" size="icon" onClick={onMenu} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] border-border/70 bg-white/90 p-0 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-4">
          <Link
            href="/dashboard"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2 font-semibold text-navy"
          >
            <LogoMark className="h-8 w-8" />
            <span className="tracking-tight">AirScan</span>
          </Link>
          <Badge className="ml-auto" variant="gold">
            NBC
          </Badge>
        </div>
        <div className="flex min-h-[calc(100dvh-56px)] flex-col gap-4 px-3 pb-4">
          <SidebarNav onNavigate={() => onOpenChange(false)} />
          <SidebarFooter />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <DesktopSidebar />
      <MobileHeader onMenu={() => setOpen(true)} />
      <MobileSidebar open={open} onOpenChange={setOpen} />

      <div className="md:pl-[260px]">
        <main className="container py-6">
          <div className="min-w-0 space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
