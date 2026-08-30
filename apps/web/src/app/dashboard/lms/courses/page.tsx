"use client";

import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Course {
  id: string;
  title: string;
  summary: string | null;
  level: string | null;
  thumbnailUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  instructor: Instructor | null;
  subject: Subject | null;
  _count: { lessons: number; enrollments: number };
}

export default function LmsCoursesPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";
  const canManage = !isStudent;

  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Instructor[]>([]);
  const [filter, setFilter] = useState<string>(isStudent ? "PUBLISHED" : "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    level: "",
    subjectId: "",
    instructorId: "",
    isFree: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = filter ? `?status=${filter}` : "";
      const { data } = await api.get<Course[]>(`/courses${q}`);
      setCourses(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load courses",
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadMeta = useCallback(async () => {
    try {
      const [subjectsRes, teachersRes] = await Promise.all([
        api.get<Subject[]>("/subjects?limit=100"),
        api.get<Instructor[]>("/teachers?limit=100"),
      ]);
      setSubjects(subjectsRes.data);
      setTeachers(teachersRes.data);
    } catch {
      // optional metadata
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (canManage) void loadMeta();
  }, [canManage, loadMeta]);

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/courses", {
        title: form.title,
        summary: form.summary || undefined,
        level: form.level || undefined,
        subjectId: form.subjectId || undefined,
        instructorId: form.instructorId || undefined,
        isFree: form.isFree,
      });
      setForm({
        title: "",
        summary: "",
        level: "",
        subjectId: "",
        instructorId: "",
        isFree: false,
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create course",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleEnroll(id: string) {
    setError(null);
    try {
      await api.post(`/courses/${id}/enrollments`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to enroll");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-sm text-muted-foreground">
            {isStudent
              ? "Browse published courses and enroll"
              : "Create and manage course content"}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="mr-2 h-4 w-4" /> New course
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Create a course</CardTitle>
            <CardDescription>
              Start as a draft and publish it when ready
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Introduction to Web Development"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Summary</Label>
              <Input
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Short description shown in the catalog"
              />
            </div>
            <div className="space-y-1">
              <Label>Level</Label>
              <Input
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                placeholder="Beginner / Intermediate / Advanced"
              />
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <select
                value={form.subjectId}
                onChange={(e) =>
                  setForm({ ...form, subjectId: e.target.value })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">None</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Instructor</Label>
              <select
                value={form.instructorId}
                onChange={(e) =>
                  setForm({ ...form, instructorId: e.target.value })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">None</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Free course
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Creating..." : "Create course"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        {!isStudent && (
          <>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <Button variant="outline" onClick={() => void load()}>
              Refresh
            </Button>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{c.title}</CardTitle>
                  <Badge
                    variant="secondary"
                    className={
                      c.status === "PUBLISHED"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : c.status === "DRAFT"
                          ? "bg-amber-500/15 text-amber-600"
                          : ""
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {c.summary ?? "No summary provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-end gap-3">
                <div className="text-xs text-muted-foreground">
                  {c.level ?? "General"} · {c._count.lessons} lessons ·{" "}
                  {c._count.enrollments} enrolled
                  {c.instructor
                    ? ` · ${c.instructor.firstName} ${c.instructor.lastName}`
                    : ""}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/lms/courses/${c.id}`}
                    className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    View
                  </Link>
                  {isStudent && c.status === "PUBLISHED" && (
                    <Button
                      variant="outline"
                      onClick={() => void handleEnroll(c.id)}
                    >
                      Enroll
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
