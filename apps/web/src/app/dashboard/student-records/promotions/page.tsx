"use client";

import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";

interface PromotionRow {
  id: string;
  status: string;
  academicYear: string;
  promotionDate: string;
  fromGradeLevel: string;
  toGradeLevel: string;
  fromClassGroup?: { id: string; name: string; gradeLevel: string } | null;
  toClassGroup?: { id: string; name: string; gradeLevel: string } | null;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    gradeLevel: string;
  } | null;
}

interface ListMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

interface ClassOption {
  id: string;
  name: string;
  gradeLevel: string;
}

const LIMIT = 10;

export default function PromotionsPage() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PromotionRow[] | null>(null);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      admissionNumber: string;
    }>
  >([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [form, setForm] = useState({
    studentId: "",
    fromClassGroupId: "",
    toClassGroupId: "",
    academicYear: "",
    promotionDate: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      const { data, meta: pagination } = await api.get<PromotionRow[]>(
        `/student-promotions?${params.toString()}`,
      );
      setItems(data);
      setMeta((pagination as unknown as ListMeta) ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load promotions",
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void Promise.all([
      api
        .get<
          Array<{
            id: string;
            firstName: string;
            lastName: string;
            admissionNumber: string;
          }>
        >("/students?limit=100")
        .then(({ data }) => setStudents(data.filter((s) => s && s.id)))
        .catch(() => {}),
      api
        .get<ClassOption[]>("/classes?limit=100")
        .then(({ data }) => setClasses(data))
        .catch(() => {}),
    ]);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/student-promotions", {
        ...form,
        promotionDate:
          form.promotionDate || new Date().toISOString().slice(0, 10),
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm({
        studentId: "",
        fromClassGroupId: "",
        toClassGroupId: "",
        academicYear: "",
        promotionDate: "",
        notes: "",
      });
      setMessage("Promotion recorded.");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to record promotion",
      );
    } finally {
      setSaving(false);
    }
  }

  async function apply(id: string) {
    setWorking(id);
    setError(null);
    setMessage(null);
    try {
      await api.post(`/student-promotions/${id}/apply`);
      setMessage("Promotion applied.");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to apply promotion",
      );
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promotions</h1>
          <p className="text-sm text-muted-foreground">
            End-of-year progression from one class to the next
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <GraduationCap className="h-4 w-4" />
          {showForm ? "Cancel" : "Record promotion"}
        </Button>
      </div>

      {message && !showForm && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Record a promotion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="prom-student">Student</Label>
                  <select
                    id="prom-student"
                    required
                    value={form.studentId}
                    onChange={(e) =>
                      setForm({ ...form, studentId: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {students.length === 0 && (
                      <option value="">No students</option>
                    )}
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prom-from">From class</Label>
                  <select
                    id="prom-from"
                    required
                    value={form.fromClassGroupId}
                    onChange={(e) =>
                      setForm({ ...form, fromClassGroupId: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {classes.length === 0 && (
                      <option value="">No classes</option>
                    )}
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.gradeLevel})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prom-to">To class</Label>
                  <select
                    id="prom-to"
                    required
                    value={form.toClassGroupId}
                    onChange={(e) =>
                      setForm({ ...form, toClassGroupId: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {classes.length === 0 && (
                      <option value="">No classes</option>
                    )}
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.gradeLevel})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prom-year">Academic year</Label>
                  <Input
                    id="prom-year"
                    required
                    placeholder="2027/2028"
                    value={form.academicYear}
                    onChange={(e) =>
                      setForm({ ...form, academicYear: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prom-date">Promotion date</Label>
                  <Input
                    id="prom-date"
                    type="date"
                    value={form.promotionDate}
                    onChange={(e) =>
                      setForm({ ...form, promotionDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="prom-notes">Notes</Label>
                  <Input
                    id="prom-notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Recording..." : "Record promotion"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Spinner className="mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items && items.length > 0 ? (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.student ? (
                      <Link
                        href={`/dashboard/students/${p.student.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {p.student.firstName} {p.student.lastName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.fromClassGroup?.name ?? p.fromGradeLevel ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.toClassGroup?.name ?? p.toGradeLevel ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{p.academicYear}</TableCell>
                  <TableCell>
                    <Badge
                      variant={p.status === "COMPLETED" ? "default" : "outline"}
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status !== "COMPLETED" && (
                      <Button
                        size="sm"
                        disabled={working === p.id}
                        onClick={() => apply(p.id)}
                      >
                        Apply
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No promotions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages} ({meta.totalItems} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
