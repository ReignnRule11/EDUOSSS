"use client";

import { ArrowLeft, QrCode, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface InvoiceItem {
  id: string;
  name: string;
  description: string | null;
  amount: number;
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

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  scholarshipAmount: number;
  paidAmount: number;
  balanceAmount: number;
  academicYear: string;
  term: string;
  dueDate: string | null;
  student: { firstName: string; lastName: string; admissionNumber: string };
  classGroup: { name: string };
  items: InvoiceItem[];
  payments: Payment[];
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-500/15 text-slate-600",
  ISSUED: "bg-blue-500/15 text-blue-600",
  PARTIAL: "bg-amber-500/15 text-amber-600",
  PAID: "bg-emerald-500/15 text-emerald-600",
  OVERDUE: "bg-red-500/15 text-red-600",
  CANCELLED: "bg-slate-500/15 text-slate-600",
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [busy, setBusy] = useState(false);
  const [gatewayUrl, setGatewayUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Invoice>(`/finance/invoices/${id}`);
      setInvoice(data);
      setAmount(data.balanceAmount > 0 ? String(data.balanceAmount) : "");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load invoice",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecordPayment() {
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    await run(() =>
      api.post(`/finance/invoices/${id}/payments`, {
        amount: Number(amount),
        method,
      }),
    );
  }

  async function handleGateway() {
    await run(async () => {
      const { data } = await api.post<{
        checkoutUrl: string;
        reference: string;
      }>(`/finance/invoices/${id}/gateway-initiate`, {});
      setGatewayUrl(data.checkoutUrl);
    });
  }

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/finance/invoices"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to invoices
      </Link>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : invoice ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Invoice {invoice.invoiceNumber}
              </h1>
              <p className="text-sm text-muted-foreground">
                {invoice.student.firstName} {invoice.student.lastName} ·{" "}
                {invoice.classGroup.name} · {invoice.academicYear} ·{" "}
                {invoice.term}
              </p>
            </div>
            <Badge variant="secondary" className={STATUS_STYLE[invoice.status]}>
              {invoice.status}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmt(invoice.totalAmount)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {fmt(invoice.paidAmount)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    invoice.balanceAmount > 0 ? "text-red-600" : ""
                  }`}
                >
                  {fmt(invoice.balanceAmount)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Applied</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Discount: {fmt(invoice.discountAmount)}</p>
                <p>Scholarship: {fmt(invoice.scholarshipAmount)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line items</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Description
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{item.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.description}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmt(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {!isStudent && invoice.balanceAmount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Record a payment</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Method</Label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="PAYSTACK">Paystack</option>
                    <option value="FLUTTERWAVE">Flutterwave</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <Button
                  onClick={() => void handleRecordPayment()}
                  disabled={busy || !amount}
                >
                  <Wallet className="mr-2 h-4 w-4" /> Record payment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleGateway()}
                  disabled={busy}
                >
                  <QrCode className="mr-2 h-4 w-4" /> Gateway payment
                </Button>
                {gatewayUrl && (
                  <p className="text-xs text-muted-foreground">
                    Mock gateway: {gatewayUrl} (confirm via the gateway route in
                    the payments page)
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Payments ({invoice.payments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {invoice.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{p.reference}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.method} ·{" "}
                          {p.paidAt ? new Date(p.paidAt).toLocaleString() : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{fmt(p.amount)}</span>
                        <Badge variant="secondary">{p.status}</Badge>
                        {p.receipt && (
                          <span className="text-xs text-muted-foreground">
                            {p.receipt.receiptNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
