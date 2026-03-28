import Link from "next/link";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function PolicyPackPage({ params }: { params: { id: string } }) {
  const [packs, clauses] = await Promise.all([
    api.policyPacks().catch(() => []),
    api.policyClauses(params.id).catch(() => []),
  ]);

  const pack = packs.find((p) => p.id === params.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy">{pack?.name || "Policy Pack"}</h1>
          <p className="text-sm text-muted-foreground">
            Version {pack?.version || "—"} · {clauses.length} clauses
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/policy-library">Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Clauses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Prohibited behaviors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clauses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No clauses.
                  </TableCell>
                </TableRow>
              ) : (
                clauses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-navy">{c.section_number}</TableCell>
                    <TableCell>
                      <div className="font-medium text-navy">{c.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.text}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.severity_level === "critical"
                            ? "critical"
                            : c.severity_level === "high"
                            ? "high"
                            : c.severity_level === "medium"
                            ? "medium"
                            : "low"
                        }
                      >
                        {c.severity_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.prohibited_behaviors.map((b) => (
                          <Badge key={b} variant="outline">
                            {b}
                          </Badge>
                        ))}
                      </div>
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
