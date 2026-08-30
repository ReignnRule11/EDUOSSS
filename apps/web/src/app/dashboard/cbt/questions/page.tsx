"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type QuestionType =
  "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "MATCHING" | "ESSAY";

interface Category {
  id: string;
  name: string;
  description: string | null;
  _count: { questions: number };
}

interface Question {
  id: string;
  type: QuestionType;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  body: string;
  points: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  category: { id: string; name: string } | null;
}

const EMPTY_FORM = {
  type: "MULTIPLE_CHOICE" as QuestionType,
  body: "",
  difficulty: "MEDIUM",
  categoryId: "",
  points: 1,
  options: "",
  correctAnswer: "",
  explanation: "",
};

export default function CbtQuestionsPage() {
  const { user } = useAuth();
  const canManage = user?.role !== "STUDENT" && user?.role !== "PARENT";

  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newCategory, setNewCategory] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, c] = await Promise.all([
        api.get<Question[]>("/questions?limit=100"),
        api.get<Category[]>("/question-categories"),
      ]);
      setQuestions(q.data);
      setCategories(c.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    setError(null);
    try {
      await api.post("/question-categories", { name: newCategory.trim() });
      setNewCategory("");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to add category",
      );
    }
  }

  async function handleCreateQuestion() {
    if (!form.body.trim()) {
      setError("Question body is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        body: form.body,
        difficulty: form.difficulty,
        points: Number(form.points) || 1,
        explanation: form.explanation || undefined,
        categoryId: form.categoryId || undefined,
      };
      if (form.type === "MULTIPLE_CHOICE") {
        const rows = form.options
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((line) => {
            const correct = line.startsWith("*");
            return {
              id: Math.random().toString(36).slice(2, 6),
              text: correct ? line.slice(1).trim() : line,
              isCorrect: correct,
            };
          });
        const correctOpts = rows.filter((o) => o.isCorrect);
        if (rows.length < 2 || correctOpts.length !== 1) {
          setError(
            "MCQ requires 2+ options and exactly one marked with a leading *",
          );
          setSaving(false);
          return;
        }
        payload.options = rows;
        const correct = correctOpts[0];
        if (correct) payload.correctAnswer = { optionId: correct.id };
      } else if (form.type === "TRUE_FALSE") {
        const v = form.correctAnswer.toLowerCase();
        if (v !== "true" && v !== "false") {
          setError("True/False requires correctAnswer 'true' or 'false'");
          setSaving(false);
          return;
        }
        payload.correctAnswer = { value: v === "true" };
      } else if (form.type === "FILL_BLANK") {
        const answers = form.correctAnswer
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (answers.length === 0) {
          setError("Fill-blank requires at least one correct answer per blank");
          setSaving(false);
          return;
        }
        payload.correctAnswer = { answers };
      } else if (form.type === "MATCHING") {
        const pairs = form.options
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((line) => {
            const [left, right] = line.split("|").map((s) => s.trim());
            return { left, right };
          });
        if (pairs.length === 0 || pairs.some((p) => !p.left || !p.right)) {
          setError("Matching requires one 'left|right' pair per line");
          setSaving(false);
          return;
        }
        payload.options = {
          left: pairs.map((p, i) => ({ id: `l${i + 1}`, text: p.left })),
          right: pairs.map((p, i) => ({ id: `r${i + 1}`, text: p.right })),
        };
        payload.correctAnswer = {
          pairs: pairs.map((_, i) => ({
            leftId: `l${i + 1}`,
            rightId: `r${i + 1}`,
          })),
        };
      }
      // ESSAY: no correctAnswer needed
      await api.post("/questions", payload);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create question",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(id: string) {
    setError(null);
    try {
      await api.delete(`/questions/${id}`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to delete question",
      );
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        You do not have permission to manage the question bank.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-sm text-muted-foreground">
            Create categories and questions used to build exams
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="mr-2 h-4 w-4" /> New question
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
            />
            <Button variant="outline" onClick={() => void handleAddCategory()}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Badge key={c.id} variant="secondary">
                {c.name} ({c._count.questions})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create a question</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Type</Label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as QuestionType,
                    options: "",
                    correctAnswer: "",
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="MULTIPLE_CHOICE">Multiple choice</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="FILL_BLANK">Fill in the blank</option>
                <option value="MATCHING">Matching</option>
                <option value="ESSAY">Essay</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Difficulty</Label>
              <select
                value={form.difficulty}
                onChange={(e) =>
                  setForm({ ...form, difficulty: e.target.value })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Body</Label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Use ____ for fill-blank blanks"
                className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Points</Label>
              <Input
                type="number"
                min={0}
                value={form.points}
                onChange={(e) =>
                  setForm({ ...form, points: Number(e.target.value) })
                }
              />
            </div>

            {form.type === "MULTIPLE_CHOICE" && (
              <div className="space-y-1 sm:col-span-2">
                <Label>
                  Options (mark the correct one with a leading * ; one per line)
                </Label>
                <textarea
                  value={form.options}
                  onChange={(e) =>
                    setForm({ ...form, options: e.target.value })
                  }
                  placeholder={"*<a>\n<link>\n<href>"}
                  className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}
            {form.type === "TRUE_FALSE" && (
              <div className="space-y-1 sm:col-span-2">
                <Label>Correct answer (true/false)</Label>
                <Input
                  value={form.correctAnswer}
                  onChange={(e) =>
                    setForm({ ...form, correctAnswer: e.target.value })
                  }
                  placeholder="true"
                />
              </div>
            )}
            {form.type === "FILL_BLANK" && (
              <div className="space-y-1 sm:col-span-2">
                <Label>
                  Correct answers (one per blank, one line each; use a | to
                  accept alternatives)
                </Label>
                <textarea
                  value={form.correctAnswer}
                  onChange={(e) =>
                    setForm({ ...form, correctAnswer: e.target.value })
                  }
                  placeholder={"h1\nsrc"}
                  className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}
            {form.type === "MATCHING" && (
              <div className="space-y-1 sm:col-span-2">
                <Label>Pairs (left|right, one per line)</Label>
                <textarea
                  value={form.options}
                  onChange={(e) =>
                    setForm({ ...form, options: e.target.value })
                  }
                  placeholder={"<p>|Paragraph\n<img>|Image"}
                  className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="space-y-1 sm:col-span-2">
              <Label>Explanation (optional)</Label>
              <textarea
                value={form.explanation}
                onChange={(e) =>
                  setForm({ ...form, explanation: e.target.value })
                }
                className="min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2 flex gap-2">
              <Button
                onClick={() => void handleCreateQuestion()}
                disabled={saving}
              >
                {saving ? "Creating..." : "Create question"}
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

      {/* Question list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Questions ({questions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner />
            </div>
          ) : questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No questions yet. Create your first question above.
            </p>
          ) : (
            <div className="space-y-2">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{q.body}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{q.type}</Badge>
                      <span>{q.difficulty}</span>
                      <span>{q.points} pts</span>
                      {q.category && <span>{q.category.name}</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete question"
                    onClick={() => void handleDeleteQuestion(q.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
