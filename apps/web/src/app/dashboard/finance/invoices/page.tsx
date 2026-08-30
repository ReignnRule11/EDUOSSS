"use client";

import { Plus, ScrollText, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface ClassGroup {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  scholarshipAmount: number;
  balanceAmount: number;
  academicYear: string;
  term: string;
  student: { firstName: string; lastName: string; admissionNumber: string };
  classGroup: { name: string };
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-500/15 text-slate-600",
  ISSUED: "bg-blue-500/15 text-blue-600",
  PARTIAL: "bg-amber-500/15 text-amber-600",
  PAID: "bg-emerald-500/15 text-emerald-600",
  OVERDUE: "bg-red-500/15 text-red-600",
  CANCELLED: "bg-slate-500/15 text-slate-600",
};

export default function InvoicesPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classWide, setClassWide] = useState(false);
  const [classGroupId, setClassGroupId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [academicYear, setAcademicYear] = useState("2026/2027");
  const [term, setTerm] = useState("FIRST");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Invoice[]>("/finance/invoices?limit=100");
      setInvoices(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load invoices",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadClasses = useCallback(async () => {
    try {
      const { data } = await api.get<ClassGroup[]>("/classes?limit=100");
      setClasses(data);
    } catch {
      // optional
    }
  }, []);

  useEffect(() => {
    if (!isStudent) void loadClasses();
  }, [isStudent, loadClasses]);

  async function handleGenerate() {
    setSaving(true);
    setError(null);
    try {
      if (classWide) {
        await api.post("/finance/invoices/generate-class", {
          classGroupId,
          academicYear,
          term,
        });
      } else {
        await api.post("/finance/invoices", {
          studentId,
          classGroupId,
          academicYear,
          term,
        });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to generate invoices",
      );
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            {isStudent
              ? "Your fee invoices and balances"
              : "Generate and manage student invoices"}
          </p>
        </div>
        {!isStudent && (
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="mr-2 h-4 w-4" /> Generate invoices
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && !isStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Generate invoices for a class/term
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={classWide}
                onChange={(e) => setClassWide(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Generate for all students in the class (skip students who already
              have one)
            </label>
            {!classWide && (
              <div className="space-y-1">
                <Label>Student id</Label>
                <Input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Paste the student id"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>Class</Label>
              <select
                value={classGroupId}
                onChange={(e) => setClassGroupId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Academic year</Label>
              <Input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Term</Label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="FIRST">First</option>
                <option value="SECOND">Second</option>
                <option value="THIRD">Third</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={() => void handleGenerate()}
                disabled={saving || !classGroupId || (!classWide && !studentId)}
              >
                <Users className="mr-2 h-4 w-4" />
                {saving ? "Generating..." : "Generate"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
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
                  {inv.balanceAmount > 0 && (
                    <div className="text-xs text-red-600">
                      {fmt(inv.balanceAmount)} due
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className={STATUS_STYLE[inv.status]}>
                  {inv.status}
                </Badge>
                <ScrollText className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
