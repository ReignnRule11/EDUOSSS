"use client";

import { UserCog } from "lucide-react";
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

interface GuardianRow {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  occupation: string | null;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  } | null;
}

interface ListMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

const LIMIT = 10;

export default function GuardiansPage() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<GuardianRow[] | null>(null);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      admissionNumber: string;
    }>
  >([]);
  const [form, setForm] = useState({
    studentId: "",
    firstName: "",
    lastName: "",
    relationship: "PARENT",
    phone: "",
    email: "",
    occupation: "",
    isPrimary: false,
    isEmergencyContact: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      const { data, meta: pagination } = await api.get<GuardianRow[]>(
        `/guardians?${params.toString()}`,
      );
      setItems(data);
      setMeta((pagination as unknown as ListMeta) ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load guardians",
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void api
      .get<
        Array<{
          id: string;
          firstName: string;
          lastName: string;
          admissionNumber: string;
        }>
      >("/students?limit=100")
      .then(({ data }) => setStudents(data.filter((s) => s && s.id)))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/guardians", {
        ...form,
        phone: form.phone || undefined,
        email: form.email || undefined,
        occupation: form.occupation || undefined,
      });
      setShowForm(false);
      setForm({
        studentId: "",
        firstName: "",
        lastName: "",
        relationship: "PARENT",
        phone: "",
        email: "",
        occupation: "",
        isPrimary: false,
        isEmergencyContact: false,
      });
      setMessage("Guardian added.");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to add guardian",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guardians</h1>
          <p className="text-sm text-muted-foreground">
            Parents and guardians linked to students
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <UserCog className="h-4 w-4" />
          {showForm ? "Cancel" : "Add guardian"}
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
              <UserCog className="h-4 w-4" />
              New guardian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="guard-student">Student</Label>
                  <select
                    id="guard-student"
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
                  <Label htmlFor="guard-first">First name</Label>
                  <Input
                    id="guard-first"
                    required
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="guard-last">Last name</Label>
                  <Input
                    id="guard-last"
                    required
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="guard-rel">Relationship</Label>
                  <select
                    id="guard-rel"
                    value={form.relationship}
                    onChange={(e) =>
                      setForm({ ...form, relationship: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {["PARENT", "GUARDIAN", "SIBLING", "OTHER"].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="guard-phone">Phone</Label>
                  <Input
                    id="guard-phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="guard-email">Email</Label>
                  <Input
                    id="guard-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="guard-occ">Occupation</Label>
                  <Input
                    id="guard-occ"
                    value={form.occupation}
                    onChange={(e) =>
                      setForm({ ...form, occupation: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-6 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.isPrimary}
                      onChange={(e) =>
                        setForm({ ...form, isPrimary: e.target.checked })
                      }
                    />
                    Primary contact
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.isEmergencyContact}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          isEmergencyContact: e.target.checked,
                        })
                      }
                    />
                    Emergency contact
                  </label>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add guardian"}
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
              <TableHead>Guardian</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Relationship</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Roles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <Spinner className="mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items && items.length > 0 ? (
              items.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    {g.firstName} {g.lastName}
                  </TableCell>
                  <TableCell>
                    {g.student ? (
                      <Link
                        href={`/dashboard/students/${g.student.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {g.student.firstName} {g.student.lastName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{g.relationship}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {g.phone ?? "—"}
                    {g.email && <span> · {g.email}</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {g.isPrimary && <Badge>Primary</Badge>}
                      {g.isEmergencyContact && (
                        <Badge variant="secondary">Emergency</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  No guardians found
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
