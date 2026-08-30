"use client";

import { Plus, Users } from "lucide-react";
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

interface Teacher {
  id: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  specialization: string | null;
  employmentType: string;
  isActive: boolean;
  school?: { name: string } | null;
}

interface SchoolOption {
  id: string;
  name: string;
  code: string;
}

interface TeacherListMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

const LIMIT = 10;
const GENDERS = ["MALE", "FEMALE", "OTHER"];
const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "ADJUNCT",
  "INTERN",
];

export default function TeachersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Teacher[] | null>(null);
  const [meta, setMeta] = useState<TeacherListMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    staffNumber: "",
    schoolId: "",
    firstName: "",
    lastName: "",
    gender: "MALE",
    phone: "",
    email: "",
    specialization: "",
    employmentType: "FULL_TIME",
    joinedAt: "",
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
      const { data, meta: pagination } = await api.get<Teacher[]>(
        `/teachers?${params.toString()}`,
      );
      setItems(data);
      setMeta((pagination as unknown as TeacherListMeta) ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load teachers",
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
      await api.post("/teachers", {
        ...form,
        email: form.email || undefined,
        phone: form.phone || undefined,
        specialization: form.specialization || undefined,
        joinedAt: form.joinedAt || undefined,
      });
      setShowForm(false);
      setForm({
        staffNumber: "",
        schoolId: "",
        firstName: "",
        lastName: "",
        gender: "MALE",
        phone: "",
        email: "",
        specialization: "",
        employmentType: "FULL_TIME",
        joinedAt: "",
      });
      setMessage("Teacher added.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add teacher");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teachers</h1>
          <p className="text-sm text-muted-foreground">
            Staff profiles, qualifications, attendance and leave management
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add teacher"}
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
              <Users className="h-4 w-4" />
              Add new teacher
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="t-staff">Staff number</Label>
                  <Input
                    id="t-staff"
                    required
                    placeholder="BFA-T010"
                    value={form.staffNumber}
                    onChange={(e) =>
                      setForm({ ...form, staffNumber: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-school">School</Label>
                  <select
                    id="t-school"
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
                  <Label htmlFor="t-gender">Gender</Label>
                  <select
                    id="t-gender"
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
                  <Label htmlFor="t-first">First name</Label>
                  <Input
                    id="t-first"
                    required
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-last">Last name</Label>
                  <Input
                    id="t-last"
                    required
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-employment">Employment type</Label>
                  <select
                    id="t-employment"
                    value={form.employmentType}
                    onChange={(e) =>
                      setForm({ ...form, employmentType: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {EMPLOYMENT_TYPES.map((et) => (
                      <option key={et} value={et}>
                        {et}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-phone">Phone</Label>
                  <Input
                    id="t-phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-email">Email</Label>
                  <Input
                    id="t-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-specialization">Specialization</Label>
                  <Input
                    id="t-specialization"
                    value={form.specialization}
                    onChange={(e) =>
                      setForm({ ...form, specialization: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-joined">Joined date</Label>
                  <Input
                    id="t-joined"
                    type="date"
                    value={form.joinedAt}
                    onChange={(e) =>
                      setForm({ ...form, joinedAt: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add teacher"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by name, staff number or email"
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
              <TableHead>Staff No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Employment</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Spinner className="mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items && items.length > 0 ? (
              items.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/dashboard/teachers/${teacher.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {teacher.staffNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/teachers/${teacher.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {teacher.firstName} {teacher.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>{teacher.gender ?? "-"}</TableCell>
                  <TableCell>{teacher.specialization ?? "-"}</TableCell>
                  <TableCell>{teacher.employmentType}</TableCell>
                  <TableCell>{teacher.school?.name ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={teacher.isActive ? "default" : "secondary"}>
                      {teacher.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  No teachers found
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
