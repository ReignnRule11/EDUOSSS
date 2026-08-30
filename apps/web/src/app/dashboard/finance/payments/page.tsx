"use client";

import { QrCode } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Payment {
  id: string;
  reference: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  gateway: string | null;
  student: { firstName: string; lastName: string; admissionNumber: string };
  invoice: { invoiceNumber: string };
  receipt: { receiptNumber: string } | null;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Payment[]>("/finance/payments?limit=100");
      setPayments(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load payments",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleConfirm(paymentId: string) {
    setError(null);
    try {
      await api.post(`/finance/payments/${paymentId}/gateway-confirm`, {});
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to confirm payment",
      );
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isStudent ? "Payment History" : "Payments & Receipts"}
        </h1>
        <p className="text-sm text-muted-foreground">
          All payments with receipts and gateway status
        </p>
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
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments yet.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Payments ({payments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">
                    {p.student.firstName} {p.student.lastName} · {p.reference}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.invoice.invoiceNumber} · {p.method}
                    {p.gateway ? ` · ${p.gateway}` : ""} ·{" "}
                    {p.paidAt
                      ? new Date(p.paidAt).toLocaleString()
                      : new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{fmt(p.amount)}</span>
                  <Badge
                    variant="secondary"
                    className={
                      p.status === "COMPLETED"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : p.status === "PENDING"
                          ? "bg-amber-500/15 text-amber-600"
                          : "bg-red-500/15 text-red-600"
                    }
                  >
                    {p.status}
                  </Badge>
                  {p.receipt && (
                    <span className="text-xs text-muted-foreground">
                      <QrCode className="mr-1 inline h-3 w-3" />
                      {p.receipt.receiptNumber}
                    </span>
                  )}
                  {p.status === "PENDING" && !isStudent && (
                    <Button
                      variant="outline"
                      onClick={() => void handleConfirm(p.id)}
                    >
                      Confirm
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
