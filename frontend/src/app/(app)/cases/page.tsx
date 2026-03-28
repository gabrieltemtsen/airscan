import Link from "next/link";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function statusVariant(status: string) {
  if (status === "complete") return "low";
  if (status === "failed") return "critical";
  if (status === "processing") return "medium";
  return "outline";
}

export default async function CasesPage() {
  const data = await api.cases({ page: 1, page_size: 50 }).catch(() => ({ items: [], total: 0 }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy">Cases</h1>
          <p className="text-sm text-muted-foreground">All compliance analyses in your workspace.</p>
        </div>
        <Button asChild variant="gold">
          <Link href="/upload">New Analysis</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">All Cases ({data.total})</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
