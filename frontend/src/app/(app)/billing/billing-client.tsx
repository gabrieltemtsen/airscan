"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton-loaders";
import { formatSeconds } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Me = {
  email: string;
  plan: "free" | "express" | "beta" | "starter" | "pro" | "enterprise";
  credits_seconds: number;
  free_analyses_used: number;
  beta_mode: boolean;
};

type Invoice = {
  id: string;
  amount_ngn: number;
  credits_seconds: number;
  paystack_reference: string;
  status: string;
  created_at: string;
};

const packs = [
  { label: "₦5,000", amount: 5000, seconds: 60 * 60 },
  { label: "₦20,000", amount: 20000, seconds: 5 * 60 * 60 },
  { label: "₦100,000", amount: 100000, seconds: 30 * 60 * 60 },
];

function InlinePulse() {
  return <span className="inline-block h-2 w-2 rounded-full bg-navy/70 animate-pulse" />;
}

export function BillingClient() {
  const { getToken } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);

  const remainingTrial = useMemo(() => {
    if (!me) return 0;
    return Math.max(0, 3 - me.free_analyses_used);
  }, [me]);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [meRes, invRes] = await Promise.all([
        fetch(`${API_URL}/api/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/billing/invoices`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);
      if (!meRes.ok) throw new Error(await meRes.text());
      setMe((await meRes.json()) as Me);
      if (invRes.ok) setInvoices((await invRes.json()) as Invoice[]);
    } catch (e: any) {
      toast.error(e.message || "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const startCheckout = useCallback(
    async (amount_ngn: number) => {
      const token = await getToken();
      if (!token) return;
      setCheckoutLoading(amount_ngn);
      try {
        const res = await fetch(`${API_URL}/api/billing/express/checkout`, {
          method: "POST",
          headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount_ngn }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        window.location.href = data.authorization_url;
      } catch (e: any) {
        toast.error(e.message || "Checkout failed");
        setCheckoutLoading(null);
      }
    },
    [getToken]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your plan and top up express credits.</p>
      </div>

      {loading && !me ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-56" />
          </CardContent>
        </Card>
      ) : null}

      {/* Beta mode banner */}
      {me?.beta_mode || me?.plan === "beta" ? (
        <Card className="border-gold bg-gold/10">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="text-2xl">🧪</span>
            <div>
              <p className="font-semibold text-navy">Beta Access — Unlimited</p>
              <p className="text-sm text-muted-foreground">
                You&apos;re on beta access. All analyses are free with no limits. Payment is disabled.
              </p>
            </div>
            <Badge variant="gold" className="ml-auto">
              BETA
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      {me ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-navy">Current plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan</span>
                <Badge variant={me.plan === "beta" ? "gold" : "default"}>
                  {me.plan === "beta" ? "🧪 BETA" : me.plan.toUpperCase()}
                </Badge>
              </div>
              {me.plan !== "beta" && !me.beta_mode && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Free trial remaining</span>
                    <span className="font-medium text-navy">{remainingTrial}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Express credits</span>
                    <span className="font-medium text-navy">{formatSeconds(me.credits_seconds)}</span>
                  </div>
                </>
              )}
              {(me.plan === "beta" || me.beta_mode) && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Analyses</span>
                  <span className="font-medium text-green-600">Unlimited ✓</span>
                </div>
              )}
              <div className="pt-3 text-xs text-muted-foreground">
                After free trial, top up express credits or subscribe to Starter/Pro.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-navy">Express top-up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {packs.map((p) => (
                <div
                  key={p.amount}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-white/50 p-3"
                >
                  <div>
                    <div className="font-medium text-navy">{p.label}</div>
                    <div className="text-xs text-muted-foreground">Adds {formatSeconds(p.seconds)} analysis time</div>
                  </div>
                  <Button variant="gold" onClick={() => startCheckout(p.amount)} disabled={checkoutLoading !== null}>
                    {checkoutLoading === p.amount ? (
                      <span className="inline-flex items-center gap-2">
                        <InlinePulse /> Redirecting…
                      </span>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" /> Buy
                      </>
                    )}
                  </Button>
                </div>
              ))}
              <div className="text-xs text-muted-foreground">
                Payments are processed via Paystack. Credits apply instantly after webhook confirmation.
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Invoice history</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonRows count={6} cols={5} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{new Date(inv.created_at).toISOString().slice(0, 10)}</TableCell>
                      <TableCell>₦{inv.amount_ngn.toLocaleString()}</TableCell>
                      <TableCell>{formatSeconds(inv.credits_seconds)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            inv.status === "success" ? "low" : inv.status === "pending" ? "medium" : "critical"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{inv.paystack_reference}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-white/50 p-4">
            <div className="font-semibold text-navy">Starter</div>
            <div className="text-sm text-muted-foreground">₦25,000/month · 10 hours · 3 seats</div>
            <div className="mt-3">
              <Button variant="outline" disabled>
                Coming soon
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-white/50 p-4">
            <div className="font-semibold text-navy">Pro</div>
            <div className="text-sm text-muted-foreground">₦75,000/month · 50 hours · 10 seats</div>
            <div className="mt-3">
              <Button variant="outline" disabled>
                Coming soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
