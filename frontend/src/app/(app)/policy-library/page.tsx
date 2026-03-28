import Link from "next/link";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function PolicyLibraryPage() {
  const packs = await api.policyPacks().catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy">Policy Library</h1>
          <p className="text-sm text-muted-foreground">Manage policy packs and clauses used for analysis.</p>
        </div>
        <Button asChild variant="gold">
          <Link href="/policy-library/upload">Upload Policy Doc</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Policy Packs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Clauses</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No policy packs found.
                  </TableCell>
                </TableRow>
              ) : (
                packs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-navy">
                      {p.name} {p.is_default ? <Badge className="ml-2" variant="gold">Default</Badge> : null}
                    </TableCell>
                    <TableCell>{p.version}</TableCell>
                    <TableCell>{p.clause_count}</TableCell>
                    <TableCell>{new Date(p.created_at).toISOString().slice(0, 10)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/policy-library/${p.id}`}>View clauses</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Default Pack</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          AirScan ships with <span className="font-medium text-navy">NBC Act 1992 (as amended)</span> pre-seeded.
        </CardContent>
      </Card>
    </div>
  );
}
