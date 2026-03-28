"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  FileText,
  LayoutDashboard,
  Upload,
  Library,
  CreditCard,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "New Analysis", icon: Upload },
  { href: "/cases", label: "Cases", icon: FileText },
  { href: "/policy-library", label: "Policy Library", icon: Library },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      <div className="border-b border-border/70 bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-white shadow-glow">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="tracking-tight">AirScan</span>
            <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium text-navy">NBC</span>
          </Link>
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>

      <div className="container grid grid-cols-1 gap-6 py-6 md:grid-cols-[240px_1fr]">
        <aside className="hidden md:block">
          <nav className="space-y-1 rounded-xl border border-border/70 bg-white/60 p-2 shadow-sm backdrop-blur">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-navy text-white"
                      : "text-navy hover:bg-navy/5"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 rounded-xl border border-border/70 bg-white/60 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <p className="font-medium text-navy">Tip</p>
            <p className="mt-1">
              Upload broadcast audio/video and get clause-linked findings with timestamps you can review.
            </p>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
