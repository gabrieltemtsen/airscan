"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SkeletonRows } from "@/components/ui/skeleton-loaders";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ApiCaseStatus = "uploading" | "processing" | "complete" | "failed";

type CaseListItem = {
  id: string;
  station_name: string | null;
  program_name: string | null;
  broadcast_date: string | null;
  status: ApiCaseStatus;
  findings_count: number;
  created_at: string;
  // Optional (backend may provide): { critical: number; high: number; medium: number; low: number }
  severity_summary?: Record<string, number> | null;
};

type Paginated = { items: CaseListItem[]; total: number };

function statusVariant(status: string) {
  if (status === "complete") return "low";
  if (status === "failed") return "critical";
  if (status === "processing") return "medium";
  return "outline";
}

const FILTERS: Array<{ key: "all" | ApiCaseStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "complete", label: "Complete" },
  { key: "processing", label: "Processing" },
  { key: "failed", label: "Failed" },
];

function SeveritySummary({ c }: { c: CaseListItem }) {
  const critical = c.severity_summary?.critical ?? null;
  const high = c.severity_summary?.high ?? null;

  if (critical == null && high == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="critical" className="text-[11px]">{critical ?? 0} Critical</Badge>
      <Badge variant="high" className="text-[11px]">{high ?? 0} High</Badge>
    </div>
  );
}

export function CasesClient() {
  const { getToken } = useAuth();
  const [data, setData] = useState<Paginated>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ApiCaseStatus>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/cases?page=1&page_size=50`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Failed to load cases (${res.status})`);
      }
      const json = (await res.json()) as Paginated;
      setData(json);
    } catch (e: any) {
      const msg = e?.message || "Failed to load cases";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.items.filter((c) => {
      const statusOk = status === "all" ? true : c.status === status;
      const station = (c.station_name || "").toLowerCase();
      const program = (c.program_name || "").toLowerCase();
      const queryOk = !q ? true : station.includes(q) || program.includes(q);
      return statusOk && queryOk;
    });
  }, [data.items, query, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy">Cases</h1>
          <p className="text-sm text-muted-foreground">All compliance analyses in your workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => load().catch(() => null)}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button asChild variant="gold">
            <Link href="/upload">New Analysis</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by station or program…"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = status === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatus(f.key)}
                className={
                  "rounded-full border px-3 py-1 text-sm font-medium transition-colors duration-200 " +
                  (active ? "border-navy bg-navy text-gold" : "border-border/70 bg-white/50 text-navy hover:bg-navy/5")
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">All Cases ({data.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonRows count={8} cols={7} />
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Broadcast Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <div className="rounded-xl border border-border/70 bg-white/50 p-8">
                        <div className="mx-auto max-w-xl text-center">
                          <div className="text-lg font-semibold text-navy">No cases match your filters</div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            Try clearing the search or switching the status filter.
                          </div>
                          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                            <Button variant="outline" onClick={() => { setQuery(""); setStatus("all"); }}>
                              Clear filters
                            </Button>
                            <Button asChild variant="gold">
                              <Link href="/upload">Start a new analysis</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-navy">{c.station_name || "—"}</TableCell>
                      <TableCell>{c.program_name || "—"}</TableCell>
                      <TableCell>{c.broadcast_date || new Date(c.created_at).toISOString().slice(0, 10)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(c.status) as any}>{c.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <SeveritySummary c={c} />
                      </TableCell>
                      <TableCell>{c.findings_count}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/cases/${c.id}`}>Open</Link>
                        </Button>
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
