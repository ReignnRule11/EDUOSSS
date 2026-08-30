"use client";

import { ArrowLeft, PlayCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface QuestionRef {
  orderIndex: number;
  question: {
    id: string;
    type: string;
    difficulty: string;
    body: string;
    points: number;
  };
}

interface ExamDetail {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  durationMinutes: number;
  passMark: number;
  negativeMarking: boolean;
  negativeMarkingValue: number;
  questions?: QuestionRef[];
}

export default function CbtExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [bank, setBank] = useState<
    Array<{ id: string; body: string; type: string }>
  >([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<ExamDetail>(`/exams/${id}/questions`);
      setExam(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load exam");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadBank = useCallback(async () => {
    try {
      const { data } = await api.get<
        Array<{ id: string; body: string; type: string }>
      >("/questions?limit=100&status=ACTIVE");
      setBank(data);
    } catch {
      // optional
    }
  }, []);

  useEffect(() => {
    void load();
    if (!isStudent) void loadBank();
  }, [load, loadBank, isStudent]);

  async function handleAddQuestions() {
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/exams/${id}/questions`, { questionIds: selected });
      setSelected([]);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to add questions",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(questionId: string) {
    setError(null);
    try {
      await api.delete(`/exams/${id}/questions/${questionId}`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to remove question",
      );
    }
  }

  async function handleRandomize() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/exams/${id}/questions/randomize`, { count: 5 });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to randomize");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setError(null);
    try {
      await api.post(`/exams/${id}/publish`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish");
    }
  }

  async function handleStart() {
    setError(null);
    try {
      const { data } = await api.post<{ id: string }>(
        `/exams/${id}/attempts`,
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
      <Link
        href="/dashboard/cbt/exams"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to exams
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
      ) : exam ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {exam.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {exam.description ?? "No description."} · {exam.durationMinutes}
                min · pass {exam.passMark}%
              </p>
            </div>
            <div className="flex gap-2">
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
              {isStudent ? (
                exam.status === "PUBLISHED" && (
                  <Button onClick={() => void handleStart()}>
                    <PlayCircle className="mr-2 h-4 w-4" /> Take exam
                  </Button>
                )
              ) : (
                <>
                  {exam.status === "DRAFT" && (
                    <Button onClick={() => void handlePublish()}>
                      Publish
                    </Button>
                  )}
                  <Link
                    href={`/dashboard/cbt/exams/${exam.id}/analytics`}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    Analytics
                  </Link>
                </>
              )}
            </div>
          </div>

          {!isStudent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Add questions from bank
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  multiple
                  value={selected}
                  onChange={(e) =>
                    setSelected(
                      Array.from(e.target.selectedOptions).map((o) => o.value),
                    )
                  }
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {bank.map((q) => (
                    <option key={q.id} value={q.id}>
                      [{q.type}] {q.body.slice(0, 80)}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void handleAddQuestions()}
                    disabled={saving || selected.length === 0}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add selected
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleRandomize()}
                    disabled={saving}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Randomize (5)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Questions ({exam.questions?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(exam.questions?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This exam has no questions yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {(exam.questions ?? []).map((q) => (
                    <div
                      key={q.question.id}
                      className="flex items-start justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium">
                          {q.orderIndex + 1}. {q.question.body}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">{q.question.type}</Badge>
                          <span>{q.question.difficulty}</span>
                          <span>{q.question.points} pts</span>
                        </div>
                      </div>
                      {!isStudent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove question"
                          onClick={() => void handleRemove(q.question.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
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
