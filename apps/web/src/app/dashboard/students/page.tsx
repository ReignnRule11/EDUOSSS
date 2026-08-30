"use client";

import { Download, Plus, Upload, Users } from "lucide-react";
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

interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  gradeLevel: string | null;
  academicStatus: string;
  photoUrl: string | null;
  school?: { name: string } | null;
}

interface SchoolOption {
  id: string;
  name: string;
  code: string;
}

interface StudentListMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

const LIMIT = 10;
const GENDERS = ["MALE", "FEMALE", "OTHER"];

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Student[] | null>(null);
  const [meta, setMeta] = useState<StudentListMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<string | null>(null);
  const [form, setForm] = useState({
    admissionNumber: "",
    schoolId: "",
    firstName: "",
    lastName: "",
    gender: "MALE",
    dateOfBirth: "",
    gradeLevel: "PRIMARY",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
    address: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (query) params.set("search", query);
      const { data, meta: pagination } = await api.get<Student[]>(
        `/students?${params.toString()}`,
      );
      setItems(data);
      setMeta((pagination as unknown as StudentListMeta) ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load students",
      );
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void api
      .get<SchoolOption[]>("/schools?limit=100")
      .then(({ data }) => setSchools(data))
      .catch(() => {});
  }, []);

  function handleSearch() {
    setPage(1);
    setQuery(search.trim());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/students", {
        ...form,
        dateOfBirth: form.dateOfBirth || undefined,
        guardianEmail: form.guardianEmail || undefined,
      });
      setShowForm(false);
      setForm({
        admissionNumber: "",
        schoolId: "",
        firstName: "",
        lastName: "",
        gender: "MALE",
        dateOfBirth: "",
        gradeLevel: "PRIMARY",
        guardianName: "",
        guardianPhone: "",
        guardianEmail: "",
        address: "",
      });
      setMessage("Student registered.");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to register student",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(importFile) as Array<Record<string, unknown>>;
      const students = parsed.map((row) => ({
        admissionNumber: String(row.admissionNumber ?? ""),
        schoolId: String(row.schoolId ?? ""),
        firstName: String(row.firstName ?? ""),
        lastName: String(row.lastName ?? ""),
        gender: String(row.gender ?? "OTHER"),
        gradeLevel: row.gradeLevel ? String(row.gradeLevel) : undefined,
        guardianName: row.guardianName ? String(row.guardianName) : undefined,
        guardianPhone: row.guardianPhone
          ? String(row.guardianPhone)
          : undefined,
        guardianEmail: row.guardianEmail
          ? String(row.guardianEmail)
          : undefined,
        dateOfBirth: row.dateOfBirth ? String(row.dateOfBirth) : undefined,
      }));
      const { data } = await api.post<{
        created: number;
        skipped: number;
        errors: Array<{ admissionNumber: string; message: string }>;
      }>("/students/bulk-import", { students, skipDuplicates: true });
      setShowImport(false);
      setImportFile(null);
      setMessage(
        `Imported ${data.created} student(s)${data.skipped ? `, skipped ${data.skipped} duplicate(s)` : ""}${data.errors.length ? `, ${data.errors.length} error(s)` : ""}.`,
      );
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to import students",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? (JSON.parse(localStorage.getItem("eduos.tokens") ?? "{}")
              .accessToken as string)
          : "";
      const tenant = JSON.parse(
        localStorage.getItem("eduos.activeTenant") ?? "{}",
      ) as { slug?: string };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"}/students/export`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Tenant-Id": tenant.slug ?? "",
          },
        },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          message?: string;
        };
        throw new Error(json?.message ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "students.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">
            Registration, profiles and records for the current school year
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => setShowImport((v) => !v)}>
            <Upload className="h-4 w-4" />
            {showImport ? "Cancel" : "Bulk import"}
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            {showForm ? "Cancel" : "Register"}
          </Button>
        </div>
      </div>

      {message && !showForm && !showImport && (
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
              <Users className="h-4 w-4" />
              Register new student
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="stu-admission">Admission number</Label>
                  <Input
                    id="stu-admission"
                    required
                    placeholder="BFA/2026/0005"
                    value={form.admissionNumber}
                    onChange={(e) =>
                      setForm({ ...form, admissionNumber: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stu-school">School</Label>
                  <select
                    id="stu-school"
                    required
                    value={form.schoolId}
                    onChange={(e) =>
                      setForm({ ...form, schoolId: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {schools.length === 0 && (
                      <option value="">No schools</option>
                    )}
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stu-gender">Gender</Label>
                  <select
                    id="stu-gender"
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stu-first">First name</Label>
                  <Input
                    id="stu-first"
                    required
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stu-last">Last name</Label>
                  <Input
                    id="stu-last"
                    required
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stu-dob">Date of birth</Label>
                  <Input
                    id="stu-dob"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) =>
                      setForm({ ...form, dateOfBirth: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stu-grade">Grade level</Label>
                  <Input
                    id="stu-grade"
                    placeholder="PRIMARY"
                    value={form.gradeLevel}
                    onChange={(e) =>
                      setForm({ ...form, gradeLevel: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stu-guardian">Guardian name</Label>
                  <Input
                    id="stu-guardian"
                    value={form.guardianName}
                    onChange={(e) =>
                      setForm({ ...form, guardianName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stu-guardian-phone">Guardian phone</Label>
                  <Input
                    id="stu-guardian-phone"
                    value={form.guardianPhone}
                    onChange={(e) =>
                      setForm({ ...form, guardianPhone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stu-guardian-email">Guardian email</Label>
                  <Input
                    id="stu-guardian-email"
                    type="email"
                    value={form.guardianEmail}
                    onChange={(e) =>
                      setForm({ ...form, guardianEmail: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="stu-address">Address</Label>
                  <Input
                    id="stu-address"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Registering..." : "Register student"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showImport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Bulk import students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleImport} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="import-json">
                  JSON array of students (admissionNumber, schoolId, firstName,
                  lastName, gender required)
                </Label>
                <textarea
                  id="import-json"
                  required
                  rows={6}
                  value={importFile ?? ""}
                  onChange={(e) => setImportFile(e.target.value)}
                  placeholder='[{"admissionNumber":"BFA/2026/0200","schoolId":"...","firstName":"Amina","lastName":"Bello","gender":"FEMALE"}]'
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowImport(false);
                    setImportFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Importing..." : "Import students"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by name, admission number or guardian"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <Button variant="secondary" onClick={handleSearch}>
          Search
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admission No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Grade Level</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Status</TableHead>
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
              items.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/dashboard/students/${student.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {student.admissionNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/students/${student.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {student.firstName} {student.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>{student.gender ?? "-"}</TableCell>
                  <TableCell>{student.gradeLevel ?? "-"}</TableCell>
                  <TableCell>{student.school?.name ?? "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        student.academicStatus === "ACTIVE"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {student.academicStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No students found
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
