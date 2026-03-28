"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
};

type Paginated = { items: CaseListItem[]; total: number };

function statusVariant(status: string) {
  if (status === "complete") return "low";
  if (status === "failed") return "critical";
  if (status === "processing") return "medium";
  return "outline";
}

export function CasesClient() {
  const { getToken } = useAuth();
  const [data, setData] = useState<Paginated>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">All Cases ({data.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading cases...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Broadcast Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No cases yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-navy">{c.station_name || "—"}</TableCell>
                      <TableCell>{c.program_name || "—"}</TableCell>
                      <TableCell>{c.broadcast_date || new Date(c.created_at).toISOString().slice(0, 10)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(c.status) as any}>{c.status}</Badge>
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
