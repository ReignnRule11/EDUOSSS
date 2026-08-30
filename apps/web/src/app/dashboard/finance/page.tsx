"use client";

import {
  ArrowRight,
  FileSpreadsheet,
  QrCode,
  ScrollText,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface RecentPayment {
  id: string;
  reference: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  student: { firstName: string; lastName: string };
}

interface Dashboard {
  totalCollected: number;
  totalOutstanding: number;
  invoiceCount: number;
  paymentCount: number;
  recentPayments: RecentPayment[];
}

export default function FinanceDashboardPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isStudent) {
        // Students see their own invoices summary instead.
        const { data: inv } = await api.get<
          Array<{
            id: string;
            invoiceNumber: string;
            status: string;
            totalAmount: number;
            balanceAmount: number;
            academicYear: string;
            term: string;
          }>
        >("/finance/invoices?limit=50");
        const totalOutstanding = inv.reduce((s, i) => s + i.balanceAmount, 0);
        setData({
          totalCollected: 0,
          totalOutstanding,
          invoiceCount: inv.length,
          paymentCount: 0,
          recentPayments: [],
        });
      } else {
        const { data } = await api.get<Dashboard>("/finance/dashboard");
        setData(data);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load finance data",
      );
    } finally {
      setLoading(false);
    }
  }, [isStudent]);

  useEffect(() => {
    void load();
  }, [load]);

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {isStudent
            ? "Your fee invoices and balances"
            : "Overview of collections, outstanding fees and recent payments"}
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
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {!isStudent && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Collected
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {fmt(data.totalCollected)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    total payments
                  </p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isStudent ? "My balance" : "Outstanding"}
                </CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmt(data.totalOutstanding)}
                </div>
                <p className="text-xs text-muted-foreground">unpaid fees</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invoices</CardTitle>
                <ScrollText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.invoiceCount}</div>
                <p className="text-xs text-muted-foreground">
                  {isStudent ? "your invoices" : "issued"}
                </p>
              </CardContent>
            </Card>
            {!isStudent && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Payments
                  </CardTitle>
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.paymentCount}</div>
                  <p className="text-xs text-muted-foreground">completed</p>
                </CardContent>
              </Card>
            )}
          </div>

          {isStudent ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/dashboard/finance/invoices"
                className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ScrollText className="h-5 w-5 text-primary" />
                  My invoices
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  View fee breakdowns, make payments
                </p>
              </Link>
              <Link
                href="/dashboard/finance/payments"
                className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <QrCode className="h-5 w-5 text-primary" />
                  Payment history
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Receipts and past payments
                </p>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link
                  href="/dashboard/finance/invoices"
                  className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ScrollText className="h-5 w-5 text-primary" />
                    Invoices
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Generate and manage student invoices
                  </p>
                </Link>
                <Link
                  href="/dashboard/finance/fee-structure"
                  className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    Fee structure
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Configure fees per class and term
                  </p>
                </Link>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent payments</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.recentPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No payments recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.recentPayments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-md border p-3 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              {p.student.firstName} {p.student.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.reference} · {p.method} ·{" "}
                              {new Date(p.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {fmt(p.amount)}
                            </span>
                            <Badge variant="secondary">{p.status}</Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
