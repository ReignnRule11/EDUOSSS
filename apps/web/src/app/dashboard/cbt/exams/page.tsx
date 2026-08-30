"use client";

import { ClipboardList, PlayCircle, Plus, Trash2 } from "lucide-react";
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

interface Exam {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  durationMinutes: number;
  passMark: number;
  negativeMarking: boolean;
  startsAt: string | null;
  endsAt: string | null;
  _count: { questions: number; attempts: number };
}

const EMPTY_FORM = {
  title: "",
  description: "",
  durationMinutes: 60,
  passMark: 50,
  negativeMarking: false,
  negativeMarkingValue: 0.25,
  shuffleQuestions: true,
  shuffleOptions: true,
  showResultsOnSubmit: true,
  maxAttempts: 1,
};

export default function CbtExamsPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [exams, setExams] = useState<Exam[]>([]);
  const [filter, setFilter] = useState<string>(isStudent ? "PUBLISHED" : "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = filter ? `?status=${filter}` : "";
      const { data } = await api.get<Exam[]>(`/exams${q}`);
      setExams(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/exams", {
        ...form,
        description: form.description || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create exam");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(id: string) {
    setError(null);
    try {
      await api.post(`/exams/${id}/publish`, {});
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to publish exam",
      );
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await api.delete(`/exams/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete exam");
    }
  }

  async function handleStart(examId: string) {
    setError(null);
    try {
      const { data } = await api.post<{ id: string }>(
        `/exams/${examId}/attempts`,
        {},
      );
      window.location.href = `/dashboard/cbt/attempts/${data.id}`;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to start the exam",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exams</h1>
          <p className="text-sm text-muted-foreground">
            {isStudent
              ? "Browse published exams and start an attempt"
              : "Build, publish and manage exams"}
          </p>
        </div>
        {!isStudent && (
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="mr-2 h-4 w-4" /> New exam
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
            <CardTitle className="text-base">Create an exam</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Midterm Mathematics Exam"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What does this exam cover?"
              />
            </div>
            <div className="space-y-1">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Pass mark (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.passMark}
                onChange={(e) =>
                  setForm({ ...form, passMark: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Max attempts</Label>
              <Input
                type="number"
                min={1}
                value={form.maxAttempts}
                onChange={(e) =>
                  setForm({ ...form, maxAttempts: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Negative marking value</Label>
              <Input
                type="number"
                min={0}
                step={0.05}
                value={form.negativeMarkingValue}
                onChange={(e) =>
                  setForm({
                    ...form,
                    negativeMarkingValue: Number(e.target.value),
                  })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.negativeMarking}
                onChange={(e) =>
                  setForm({ ...form, negativeMarking: e.target.checked })
                }
                className="h-4 w-4 rounded border-input"
              />
              Apply negative marking on wrong objective answers
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.shuffleQuestions}
                onChange={(e) =>
                  setForm({ ...form, shuffleQuestions: e.target.checked })
                }
                className="h-4 w-4 rounded border-input"
              />
              Shuffle questions
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.shuffleOptions}
                onChange={(e) =>
                  setForm({ ...form, shuffleOptions: e.target.checked })
                }
                className="h-4 w-4 rounded border-input"
              />
              Shuffle MCQ options
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.showResultsOnSubmit}
                onChange={(e) =>
                  setForm({ ...form, showResultsOnSubmit: e.target.checked })
                }
                className="h-4 w-4 rounded border-input"
              />
              Show results immediately after submission
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Creating..." : "Create exam"}
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
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
        {!isStudent && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="CLOSED">Closed</option>
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : exams.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isStudent
            ? "No published exams are available right now."
            : "No exams yet. Create one to get started."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{exam.title}</CardTitle>
                  <Badge
                    variant="secondary"
                    className={
                      exam.status === "PUBLISHED"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : exam.status === "DRAFT"
                          ? "bg-amber-500/15 text-amber-600"
                          : ""
                    }
                  >
                    {exam.status}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {exam.description ?? "No description provided."}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-end gap-3">
                <div className="text-xs text-muted-foreground">
                  {exam.durationMinutes} min · pass {exam.passMark}% ·
                  {exam.negativeMarking ? " negative marking" : " no penalties"}{" "}
                  ·{exam._count.questions} questions · {exam._count.attempts}{" "}
                  attempts
                </div>
                <div className="flex gap-2">
                  {isStudent ? (
                    exam.status === "PUBLISHED" ? (
                      <Button
                        className="flex-1"
                        onClick={() => void handleStart(exam.id)}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" /> Take exam
                      </Button>
                    ) : (
                      <span className="flex-1 text-center text-xs text-muted-foreground">
                        Not available
                      </span>
                    )
                  ) : (
                    <Link
                      href={`/dashboard/cbt/exams/${exam.id}`}
                      className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Manage
                    </Link>
                  )}
                  {!isStudent && exam.status === "DRAFT" && (
                    <Button
                      variant="outline"
                      onClick={() => void handlePublish(exam.id)}
                    >
                      Publish
                    </Button>
                  )}
                  {!isStudent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete exam"
                      onClick={() => void handleDelete(exam.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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
