"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface OutstandingInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  balanceAmount: number;
  status: string;
  academicYear: string;
  term: string;
  student: { firstName: string; lastName: string; admissionNumber: string };
  classGroup: { name: string };
}

export default function OutstandingPage() {
  const [items, setItems] = useState<OutstandingInvoice[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta } = await api.get<OutstandingInvoice[]>(
        "/finance/invoices/outstanding?limit=100",
      );
      setItems(data);
      setTotalOutstanding((meta?.totalOutstanding as number) ?? 0);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load outstanding fees",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Outstanding Fees</h1>
        <p className="text-sm text-muted-foreground">
          Invoices with an unpaid balance
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Total outstanding
          </CardTitle>
          <div className="text-2xl font-bold text-red-600">
            {fmt(totalOutstanding)}
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No outstanding fees. All invoices are settled.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((inv) => (
            <Link
              key={inv.id}
              href={`/dashboard/finance/invoices/${inv.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">
                  {inv.student.firstName} {inv.student.lastName} ·{" "}
                  {inv.invoiceNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inv.classGroup.name} · {inv.academicYear} · {inv.term} ·{" "}
                  {inv.student.admissionNumber}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {fmt(inv.totalAmount)}
                  </div>
                  <div className="text-xs text-red-600">
                    {fmt(inv.balanceAmount)} due
                  </div>
                </div>
                <Badge variant="secondary">{inv.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
