"use client";

import { Plus, School } from "lucide-react";
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

interface ClassRow {
  id: string;
  schoolId: string;
  name: string;
  gradeLevel: string;
  roomNumber: string | null;
  capacity: number;
  headTeacherId: string | null;
  academicYear: string | null;
  isActive: boolean;
  school?: { id: string; name: string; code: string };
  headTeacher?: {
    id: string;
    firstName: string;
    lastName: string;
    staffNumber: string;
  } | null;
  _count?: { enrollments?: number };
}

const GRADE_LEVELS = [
  "NURSERY",
  "KG",
  "PRIMARY",
  "JUNIOR_SECONDARY",
  "SENIOR_SECONDARY",
];

export default function ClassesPage() {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [items, setItems] = useState<ClassRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    schoolId: "",
    name: "",
    gradeLevel: "PRIMARY",
    roomNumber: "",
    capacity: "40",
    headTeacherId: "",
    academicYear: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<ClassRow[]>("/classes?limit=100");
      setItems(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load classes",
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        headTeacherId: form.headTeacherId || undefined,
        academicYear: form.academicYear || undefined,
      };
      await api.post("/classes", payload);
      setShowForm(false);
      setForm({
        schoolId: "",
        name: "",
        gradeLevel: "PRIMARY",
        roomNumber: "",
        capacity: "40",
        headTeacherId: "",
        academicYear: "",
      });
      setMessage("Class created.");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create class",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Classes</h1>
          <p className="text-sm text-muted-foreground">
            Class groups, rooms and head teachers
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "New class"}
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
              <School className="h-4 w-4" />
              New class group
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="class-school">School</Label>
                  <select
                    id="class-school"
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
                  <Label htmlFor="class-name">Name</Label>
                  <Input
                    id="class-name"
                    required
                    placeholder="Primary 4A"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="class-grade">Grade level</Label>
                  <select
                    id="class-grade"
                    value={form.gradeLevel}
                    onChange={(e) =>
                      setForm({ ...form, gradeLevel: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="class-room">Room number</Label>
                  <Input
                    id="class-room"
                    value={form.roomNumber}
                    onChange={(e) =>
                      setForm({ ...form, roomNumber: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="class-capacity">Capacity</Label>
                  <Input
                    id="class-capacity"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) =>
                      setForm({ ...form, capacity: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="class-year">Academic year</Label>
                  <Input
                    id="class-year"
                    placeholder="2026/2027"
                    value={form.academicYear}
                    onChange={(e) =>
                      setForm({ ...form, academicYear: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="class-head">Head teacher</Label>
                  <select
                    id="class-head"
                    value={form.headTeacherId}
                    onChange={(e) =>
                      setForm({ ...form, headTeacherId: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">— No head teacher —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName} ({t.staffNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create class"}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((classGroup) => (
            <Card key={classGroup.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{classGroup.name}</span>
                  <Badge
                    variant={classGroup.isActive ? "default" : "secondary"}
                  >
                    {classGroup.isActive ? "Active" : "Inactive"}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {classGroup.school?.name ?? "—"} · {classGroup.gradeLevel}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  {classGroup.academicYear && (
                    <Badge variant="secondary">{classGroup.academicYear}</Badge>
                  )}
                  {classGroup.roomNumber && (
                    <Badge variant="outline">
                      Room {classGroup.roomNumber}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  Capacity {classGroup.capacity} ·{" "}
                  {classGroup._count?.enrollments ?? 0} enrolled
                </p>
                <p className="text-muted-foreground">
                  Head:{" "}
                  {classGroup.headTeacher
                    ? `${classGroup.headTeacher.firstName} ${classGroup.headTeacher.lastName}`
                    : "Not assigned"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-muted-foreground">
          No classes found
        </p>
      )}
    </div>
  );
}
