"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { BarChart3, FileText, Gauge, Library, Plus, RefreshCw, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard, SkeletonRows } from "@/components/ui/skeleton-loaders";
import { formatSeconds } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Me = {
  email: string;
  plan: string;
  credits_seconds: number;
  free_analyses_used: number;
  beta_mode?: boolean;
};

type Usage = {
  total_cases: number;
  findings_this_month: number;
  hours_analyzed_total: number;
  seconds_used_total: number;
  subscription_seconds_remaining: number;
  policy_packs: number;
};

type CaseListItem = {
  id: string;
  station_name: string | null;
  program_name: string | null;
  broadcast_date: string | null;
  status: "uploading" | "processing" | "complete" | "failed";
  findings_count: number;
  created_at: string;
};

type CasesResp = { items: CaseListItem[]; total: number };

function StatusBadge({ status }: { status: string }) {
  const v = status === "complete" ? "low" : status === "failed" ? "critical" : "medium";
  return <Badge variant={v as any}>{status}</Badge>;
}

function useCountUp(target: number, { durationMs = 700 } = {}) {
  const [v, setV] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = Number.isFinite(target) ? target : 0;

    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, target]);

  return v;
}

export function DashboardClient() {
  const { getToken } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [cases, setCases] = useState<CasesResp>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const headers = { Authorization: `Bearer ${token}` };
      const [meRes, usageRes, casesRes] = await Promise.all([
        fetch(`${API_URL}/api/user/me`, { headers, cache: "no-store" }),
        fetch(`${API_URL}/api/user/usage`, { headers, cache: "no-store" }),
        fetch(`${API_URL}/api/cases?page=1&page_size=7`, { headers, cache: "no-store" }),
      ]);

      if (!meRes.ok) throw new Error(await meRes.text());
      setMe((await meRes.json()) as Me);

      if (usageRes.ok) setUsage((await usageRes.json()) as Usage);
      if (casesRes.ok) setCases((await casesRes.json()) as CasesResp);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const freeRemaining = useMemo(() => Math.max(0, 3 - (me?.free_analyses_used || 0)), [me]);
  const credits = me?.credits_seconds || 0;
  const subscriptionSeconds = usage?.subscription_seconds_remaining ?? 0;
  const usageTotal = usage?.seconds_used_total ?? 0;

  const allowance = useMemo(() => {
    const plan = me?.plan;
    if (plan === "starter") return 10 * 3600;
    if (plan === "pro") return 50 * 3600;
    if (plan === "enterprise" || plan === "beta") return 999999;
    if (plan === "express") return Math.max(credits, 1);
    return 3 * 600;
  }, [credits, me?.plan]);

  const usagePct = Math.min(100, Math.round((usageTotal / Math.max(allowance, 1)) * 100));

  const totalCasesAnim = useCountUp(usage?.total_cases ?? cases.total ?? 0);
  const findingsMonthAnim = useCountUp(usage?.findings_this_month ?? 0);
  const hoursAnim = useCountUp(usage?.hours_analyzed_total ?? 0);
  const packsAnim = useCountUp(usage?.policy_packs ?? 1);

  const retryCase = useCallback(
    async (id: string) => {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/cases/${id}/retry`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Retry started");
        await load();
      } catch (e: any) {
        toast.error(e?.message || "Failed to retry case");
      }
    },
    [getToken, load]
  );

  return (
    <div className="space-y-6">
      {me?.beta_mode ? (
        <div className="rounded-xl border border-gold/40 bg-gold px-4 py-3 text-sm font-medium text-navy">
          🧪 You&apos;re on beta access — unlimited analyses
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your compliance monitoring workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => load().catch(() => null)}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button asChild variant="gold" size="lg">
            <Link href="/upload">
              <Plus className="h-4 w-4" /> New Analysis
            </Link>
          </Button>
        </div>
      </div>

      {loading && !me ? (
        <div className="grid gap-4 md:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total Cases</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-3xl font-semibold text-navy">{Math.round(totalCasesAnim)}</div>
              <FileText className="h-5 w-5 text-gold" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Findings This Month</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-3xl font-semibold text-navy">{Math.round(findingsMonthAnim)}</div>
              <BarChart3 className="h-5 w-5 text-gold" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Hours Analyzed</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-3xl font-semibold text-navy">{hoursAnim.toFixed(1)}</div>
              <Gauge className="h-5 w-5 text-gold" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Policy Packs</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-3xl font-semibold text-navy">{Math.round(packsAnim)}</div>
              <Library className="h-5 w-5 text-gold" />
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="text-muted-foreground">
              Plan: <span className="font-medium text-navy">{(me?.plan || "free").toUpperCase()}</span>
            </div>
            <div className="text-muted-foreground">
              Free trial remaining: <span className="font-medium text-navy">{freeRemaining}</span>
            </div>
            <div className="text-muted-foreground">
              Express credits: <span className="font-medium text-navy">{formatSeconds(credits)}</span>
            </div>
            <div className="text-muted-foreground">
              Subscription remaining: <span className="font-medium text-navy">{formatSeconds(subscriptionSeconds)}</span>
            </div>
          </div>
          <Progress value={usagePct} />
          <div className="text-xs text-muted-foreground">Used {formatSeconds(usageTotal)} · {usagePct}%</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Recent Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <SkeletonRows count={5} cols={5} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <div className="rounded-xl border border-border/70 bg-white/50 p-6">
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-base font-semibold text-navy">No cases yet</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              Start your first analysis to generate clause-linked findings.
                            </div>
                          </div>
                          <Button asChild variant="gold" size="lg" className="w-full sm:w-auto">
                            <Link href="/upload">Start your first analysis</Link>
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  cases.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-navy">{c.station_name || "—"}</TableCell>
                      <TableCell>{c.broadcast_date || new Date(c.created_at).toISOString().slice(0, 10)}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell>{c.findings_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {c.status === "failed" ? (
                            <Button size="sm" variant="outline" onClick={() => retryCase(c.id)}>
                              <RotateCcw className="h-4 w-4" /> Retry
                            </Button>
                          ) : null}
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/cases/${c.id}`}>Open</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
