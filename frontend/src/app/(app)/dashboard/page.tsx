import Link from "next/link";
import { BarChart3, FileText, Gauge, Library, Plus } from "lucide-react";

import { api } from "@/lib/api";
import { formatSeconds } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function StatusBadge({ status }: { status: string }) {
  const v = status === "complete" ? "low" : status === "failed" ? "critical" : "medium";
  return <Badge variant={v as any}>{status}</Badge>;
}

const DEFAULT_ME = { email: "", plan: "free" as const, credits_seconds: 0, free_analyses_used: 0 };

export default async function DashboardPage() {
  const [me, usage, cases] = await Promise.all([
    api.me().catch(() => DEFAULT_ME),
    api.usage().catch(() => null),
    api.cases({ page: 1, page_size: 7 }).catch(() => ({ items: [], total: 0 })),
  ]);

  const freeRemaining = Math.max(0, 3 - (me.free_analyses_used || 0));
  const credits = me.credits_seconds || 0;
  const subscriptionSeconds = usage?.subscription_seconds_remaining ?? 0;

  const usageTotal = (usage?.seconds_used_total ?? 0) as number;
  const allowance =
    me.plan === "starter"
      ? 10 * 3600
      : me.plan === "pro"
      ? 50 * 3600
      : me.plan === "enterprise"
      ? 999999
      : me.plan === "express"
      ? Math.max(credits, 1)
      : 3 * 600;

  const usagePct = Math.min(100, Math.round((usageTotal / Math.max(allowance, 1)) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your compliance monitoring workspace.</p>
        </div>
        <Button asChild variant="gold" size="lg">
          <Link href="/upload">
            <Plus className="h-4 w-4" /> New Analysis
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total Cases</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold text-navy">{usage?.total_cases ?? cases.total ?? 0}</div>
            <FileText className="h-5 w-5 text-gold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Findings This Month</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold text-navy">{usage?.findings_this_month ?? 0}</div>
            <BarChart3 className="h-5 w-5 text-gold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Hours Analyzed</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold text-navy">{(usage?.hours_analyzed_total ?? 0).toFixed(1)}</div>
            <Gauge className="h-5 w-5 text-gold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Policy Packs</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold text-navy">{usage?.policy_packs ?? 1}</div>
            <Library className="h-5 w-5 text-gold" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="text-muted-foreground">
              Plan: <span className="font-medium text-navy">{me.plan.toUpperCase()}</span>
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
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No cases yet. Start a new analysis.
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
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/cases/${c.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
