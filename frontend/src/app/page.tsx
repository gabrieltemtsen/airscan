import Link from "next/link";
import {
  FileSearch,
  ShieldCheck,
  Sparkles,
  Timer,
  CheckCircle2,
  FileText,
  PlayCircle,
  UploadCloud,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NavAuthButtons, HeroAuthButton } from "@/components/auth-buttons";

function PricingCard({
  name,
  price,
  subtitle,
  bullets,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  subtitle: string;
  bullets: string[];
  cta: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-gold/50 shadow-glow" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-navy">{name}</CardTitle>
          {highlight ? <Badge variant="gold">Most Popular</Badge> : null}
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-navy">{price}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <span className="text-muted-foreground">{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5">{cta}</div>
      </CardContent>
    </Card>
  );
}

function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
      {children}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-navy transition-colors duration-200 hover:text-navy/90">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white shadow-glow">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="tracking-tight">AirScan</span>
            <Badge variant="gold" className="ml-2">
              NBC Nigeria
            </Badge>
          </Link>
          <NavAuthButtons />
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="airscan-hero-bg absolute inset-0" />
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-gold/25 blur-3xl" />
          <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />

          <div className="container relative py-16 md:py-20">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-white/80 backdrop-blur">
                  <Sparkles className="h-4 w-4 text-gold" />
                  Policy-aware detection with timestamps
                </div>

                <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  Broadcast compliance monitoring that feels instant.
                </h1>
                <p className="mt-4 text-balance text-lg text-white/80">
                  Upload broadcast audio/video, auto-transcribe, detect NBC compliance breaches, and generate regulator-ready
                  PDF reports — in minutes, not days.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <HeroAuthButton />
                  <Button asChild variant="outline" size="lg">
                    <a href="#demo" className="text-navy">
                      <PlayCircle className="h-4 w-4" /> Watch demo
                    </a>
                  </Button>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <StatPill>10+ clauses analyzed</StatPill>
                  <StatPill>NBC Act built-in</StatPill>
                  <StatPill>3 free analyses</StatPill>
                  <StatPill>PDF reports</StatPill>
                </div>
              </div>

              <div className="relative">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">Compliance snapshot</div>
                    <Badge variant="gold">Live</Badge>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {[
                      { title: "Clause-linked findings", desc: "Severity + confidence + quote + timestamp." },
                      { title: "Reviewer workflow", desc: "Approve, reject, annotate — keep an audit trail." },
                      { title: "Exports", desc: "PDF/CSV reports for internal review and regulators." },
                    ].map((x) => (
                      <div key={x.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="text-sm font-semibold text-white">{x.title}</div>
                        <div className="mt-1 text-sm text-white/70">{x.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
                    <Timer className="h-4 w-4 text-gold" /> Typical turnaround: 2–6 minutes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-10">
          <div className="grid gap-4 md:grid-cols-3">
            {[{
              icon: UploadCloud,
              title: "Fast ingest",
              desc: "Direct-to-storage uploads for reliability on large broadcast files.",
            }, {
              icon: FileSearch,
              title: "Policy-aware detection",
              desc: "Gemini-powered analysis mapped to NBC clauses with confidence scoring.",
            }, {
              icon: FileText,
              title: "Export-ready evidence",
              desc: "Generate PDF/CSV with quotes, timestamps, and recommended actions.",
            }].map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <CardTitle className="text-base text-navy">{f.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{f.desc}</CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="container py-10" id="demo">
          <div className="rounded-2xl border border-border/70 bg-white/60 p-6 backdrop-blur">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-navy">How it works</h2>
                <p className="mt-1 text-sm text-muted-foreground">A clean pipeline from upload to review.</p>
              </div>
              <Button asChild variant="outline">
                <a href="#pricing">View pricing</a>
              </Button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {[
                { n: 1, title: "Upload", desc: "Audio/video up to 60 minutes." },
                { n: 2, title: "Transcribe", desc: "Timestamped segments for quick navigation." },
                { n: 3, title: "Detect", desc: "Clause-linked findings with severity & confidence." },
                { n: 4, title: "Review", desc: "Approve/reject/edit, then export PDF." },
              ].map((s) => (
                <div key={s.title} className="rounded-xl border border-border/70 bg-white/50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy text-sm font-semibold text-gold">
                      {s.n}
                    </span>
                    <div className="font-semibold text-navy">{s.title}</div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{s.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gold" /> NBC Act pack included
              </div>
              <div className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gold" /> Reviewer workflow
              </div>
              <div className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gold" /> PDF/CSV exports
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="container py-16">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-navy">Pricing</h2>
            <p className="mt-2 text-muted-foreground">Start free, then pay-per-use or subscribe.</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <PricingCard
              name="Free Trial"
              price="₦0"
              subtitle="3 analyses · max 10 minutes each"
              bullets={["NBC Act policy pack included", "Clause-linked findings", "PDF + CSV export"]}
              cta={
                <Button asChild variant="gold" className="w-full">
                  <Link href="/sign-up">Start free</Link>
                </Button>
              }
            />
            <PricingCard
              name="Express"
              price="Credits"
              subtitle="Pay-per-use in NGN"
              bullets={["₦5,000 / ₦20,000 / ₦100,000 packs", "Fast turnaround", "Great for irregular workloads"]}
              cta={
                <Button asChild variant="outline" className="w-full">
                  <Link href="/billing">Top up</Link>
                </Button>
              }
              highlight
            />
            <PricingCard
              name="Starter"
              price="₦25,000/mo"
              subtitle="10 hours · 3 seats"
              bullets={["Team workspace", "Usage tracking", "Priority processing"]}
              cta={
                <Button asChild className="w-full">
                  <Link href="/billing">Choose Starter</Link>
                </Button>
              }
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <PricingCard
              name="Pro"
              price="₦75,000/mo"
              subtitle="50 hours · 10 seats · audit trail"
              bullets={["Advanced audit trail", "Policy library management", "Reviewer workflow"]}
              cta={
                <Button asChild className="w-full">
                  <Link href="/billing">Choose Pro</Link>
                </Button>
              }
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              subtitle="Unlimited · SSO · custom hosting"
              bullets={["Dedicated infrastructure", "SSO/SAML", "Custom policy integrations"]}
              cta={
                <Button variant="outline" className="w-full" asChild>
                  <a href="mailto:hello@airscan.ng">Contact sales</a>
                </Button>
              }
            />
          </div>
        </section>

        <footer className="border-t border-border/70 bg-white/60 py-10">
          <div className="container flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AirScan — Broadcast Compliance Monitoring
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <a className="transition-colors duration-200 hover:text-navy" href="#pricing">
                Pricing
              </a>
              <a className="transition-colors duration-200 hover:text-navy" href="mailto:hello@airscan.ng">
                Contact
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
