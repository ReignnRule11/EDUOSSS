"use client";

import { ArrowLeft, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  balanceAmount: number;
  paidAmount: number;
  academicYear: string;
  term: string;
  items: Array<{ name: string; amount: number }>;
}

interface Payment {
  id: string;
  reference: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string | null;
  receipt: { receiptNumber: string } | null;
}

interface PaymentsData {
  invoices: Invoice[];
  payments: Payment[];
}

const STATUS_STYLE: Record<string, string> = {
  ISSUED: "bg-blue-500/15 text-blue-600",
  PARTIAL: "bg-amber-500/15 text-amber-600",
  PAID: "bg-emerald-500/15 text-emerald-600",
  OVERDUE: "bg-red-500/15 text-red-600",
};

export default function ChildPaymentsPage() {
  const { childId } = useParams<{ childId: string }>();
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<PaymentsData>(
        `/parent/children/${childId}/payments`,
      );
      setData(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load payments",
      );
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/parent"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to children
      </Link>

      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Invoices ({data.invoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoices.</p>
                ) : (
                  data.invoices.map((inv) => (
                    <div key={inv.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{inv.invoiceNumber}</span>
                        <Badge
                          variant="secondary"
                          className={STATUS_STYLE[inv.status]}
                        >
                          {inv.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {inv.academicYear} · {inv.term}
                      </p>
                      <div className="mt-2 flex justify-between text-xs">
                        <span>Total: {fmt(inv.totalAmount)}</span>
                        <span>Paid: {fmt(inv.paidAmount)}</span>
                        {inv.balanceAmount > 0 && (
                          <span className="text-red-600">
                            Due: {fmt(inv.balanceAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Payment history ({data.payments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No payments yet.
                  </p>
                ) : (
                  data.payments.map((p) => (
                    <div key={p.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.reference}</span>
                        <Badge variant="secondary">{p.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.method} · {fmt(p.amount)}
                        {p.receipt ? ` · ${p.receipt.receiptNumber}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
