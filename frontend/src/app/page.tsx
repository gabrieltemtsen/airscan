import Link from "next/link";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowRight, AudioLines, FileSearch, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
              <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-gold" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5">{cta}</div>
      </CardContent>
    </Card>
  );
}

export default function LandingPage() {
  return (
    <div>
      <header className="border-b border-border/70 bg-white/60 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-navy">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white shadow-glow">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>AirScan</span>
            <Badge variant="gold" className="ml-2">NBC Nigeria</Badge>
          </div>
          <div className="flex items-center gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline">Sign in</Button>
              </SignInButton>
              <SignInButton mode="modal">
                <Button variant="gold">Start Free Trial</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button asChild variant="gold">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </SignedIn>
          </div>
        </div>
      </header>

      <main>
        <section className="container py-16 md:py-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/60 px-3 py-1 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-gold" />
                AI + policy-aware analysis with timestamps
              </div>
              <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-navy md:text-5xl">
                AI-Powered Broadcast Compliance Monitoring
              </h1>
              <p className="mt-4 text-balance text-lg text-muted-foreground">
                Upload broadcast audio/video, transcribe with Whisper, detect NBC compliance breaches with Gemini, and export
                regulator-ready reports.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="gold" size="lg">
                      Start Free Trial <ArrowRight className="h-4 w-4" />
                    </Button>
                  </SignInButton>
                  <Button asChild variant="outline" size="lg">
                    <a href="#pricing">View pricing</a>
                  </Button>
                </SignedOut>
                <SignedIn>
                  <Button asChild variant="gold" size="lg">
                    <Link href="/upload">New analysis</Link>
                  </Button>
                </SignedIn>
              </div>
            </div>

            <Card className="border-gold/30 shadow-glow">
              <CardHeader>
                <CardTitle className="text-navy">How it works</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white">
                    <AudioLines className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Upload</div>
                    <div className="text-sm text-muted-foreground">Audio/video up to 60 minutes, 500MB.</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-navy">
                    <FileSearch className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Transcribe → Detect</div>
                    <div className="text-sm text-muted-foreground">Clause-linked findings with severity + confidence.</div>
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-white/60 p-4 text-sm">
                  <div className="font-semibold text-navy">Outputs</div>
                  <div className="mt-1 text-muted-foreground">PDF compliance report + CSV findings for audit workflows.</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container py-4 md:py-10">
          <div className="grid gap-4 md:grid-cols-4">
            {["Upload", "Transcribe", "Detect", "Report"].map((t) => (
              <Card key={t}>
                <CardHeader>
                  <CardTitle className="text-base text-navy">{t}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {t === "Upload" && "Drag-and-drop ingest with direct-to-storage uploads."}
                  {t === "Transcribe" && "Whisper timestamped segments for fast review."}
                  {t === "Detect" && "Gemini-based breach analysis using your policy packs."}
                  {t === "Report" && "Export-ready PDF/CSV reports and reviewer actions."}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="pricing" className="container py-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-navy">Pricing</h2>
              <p className="mt-2 text-muted-foreground">
                Start with a free trial, then choose pay-per-use credits or a monthly subscription.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <PricingCard
              name="Free Trial"
              price="₦0"
              subtitle="3 analyses · max 10 minutes each"
              bullets={["Policy pack: NBC Act", "Clause-linked findings", "PDF + CSV export"]}
              cta={
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="gold" className="w-full">Start</Button>
                  </SignInButton>
                </SignedOut>
              }
            />
            <PricingCard
              name="Express"
              price="Credits"
              subtitle="Pay-per-use"
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
              subtitle="10 hours analysis · 3 seats"
              bullets={["Team workspace", "Usage tracking", "Priority processing"]}
              cta={<Button asChild className="w-full"><Link href="/billing">Choose Starter</Link></Button>}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <PricingCard
              name="Pro"
              price="₦75,000/mo"
              subtitle="50 hours · 10 seats · audit trail"
              bullets={["Advanced audit trail", "Policy library management", "Reviewer workflow"]}
              cta={<Button asChild className="w-full"><Link href="/billing">Choose Pro</Link></Button>}
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              subtitle="Unlimited · SSO · custom hosting"
              bullets={["Dedicated infra options", "SSO/SAML", "Custom policy integrations"]}
              cta={<Button variant="outline" className="w-full" asChild><a href="mailto:sales@airscan.ng">Contact sales</a></Button>}
            />
          </div>
        </section>

        <footer className="border-t border-border/70 bg-white/60 py-10">
          <div className="container flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AirScan. Built for broadcast compliance monitoring.
            </div>
            <div className="text-sm text-muted-foreground">
              <a className="hover:text-navy" href="#pricing">Pricing</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
