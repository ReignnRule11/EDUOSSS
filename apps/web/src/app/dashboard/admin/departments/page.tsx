"use client";

import { Network, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface SchoolOption {
  id: string;
  name: string;
  code: string;
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
  staffNumber: string;
}

interface DepartmentRow {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  headTeacher?: {
    id: string;
    firstName: string;
    lastName: string;
    staffNumber: string;
  } | null;
  school?: { id: string; name: string; code: string };
  _count?: { teachers?: number; timetableSlots?: number };
}

export default function DepartmentsPage() {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [items, setItems] = useState<DepartmentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    schoolId: "",
    name: "",
    code: "",
    headTeacherId: "",
    description: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<DepartmentRow[]>("/departments?limit=100");
      setItems(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load departments",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void Promise.all([
      api
        .get<SchoolOption[]>("/schools?limit=100")
        .then(({ data }) => setSchools(data))
        .catch(() => {}),
      api
        .get<TeacherOption[]>("/teachers?limit=100")
        .then(({ data }) => setTeachers(data))
        .catch(() => {}),
    ]);
  }, []);

  function handleEdit(department: DepartmentRow) {
    setEditingId(department.id);
    setShowForm(true);
    setMessage(null);
    setForm({
      schoolId: department.schoolId,
      name: department.name,
      code: department.code,
      headTeacherId: department.headTeacher?.id ?? "",
      description: department.description ?? "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        ...form,
        headTeacherId: form.headTeacherId || undefined,
      };
      if (editingId) {
        await api.patch(`/departments/${editingId}`, payload);
      } else {
        await api.post("/departments", payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({
        schoolId: "",
        name: "",
        code: "",
        headTeacherId: "",
        description: "",
      });
      setMessage(editingId ? "Department updated." : "Department created.");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save department",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground">
            Academic departments and their heads
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setShowForm((v) => !v);
            setMessage(null);
          }}
        >
          <Plus className="h-4 w-4" />
          {showForm && !editingId ? "Cancel" : "New department"}
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
              <Network className="h-4 w-4" />
              {editingId ? "Edit department" : "New department"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="dept-school">School</Label>
                  <select
                    id="dept-school"
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
                  <Label htmlFor="dept-code">Code</Label>
                  <Input
                    id="dept-code"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="dept-name">Name</Label>
                  <Input
                    id="dept-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="dept-head">Head of department</Label>
                  <select
                    id="dept-head"
                    value={form.headTeacherId}
                    onChange={(e) =>
                      setForm({ ...form, headTeacherId: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">— No head assigned —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName} ({t.staffNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="dept-desc">Description</Label>
                  <Input
                    id="dept-desc"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create department"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((department) => (
            <Card key={department.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>{department.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {department.code} · {department.school?.name ?? "—"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit department"
                  onClick={() => handleEdit(department)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={department.isActive ? "default" : "secondary"}
                  >
                    {department.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="secondary">
                    {department._count?.teachers ?? 0} teachers
                  </Badge>
                  <Badge variant="outline">
                    {department._count?.timetableSlots ?? 0} slots
                  </Badge>
                </div>
                {department.description && (
                  <p className="text-muted-foreground">
                    {department.description}
                  </p>
                )}
                <p className="text-muted-foreground">
                  Head:{" "}
                  {department.headTeacher
                    ? `${department.headTeacher.firstName} ${department.headTeacher.lastName}`
                    : "Not assigned"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-muted-foreground">
          No departments found
        </p>
      )}
    </div>
  );
}
