"use client";

import {
  BookOpen,
  ClipboardList,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Tool =
  "lesson" | "questions" | "comment" | "tutor" | "recommendation" | "insights";

const TOOLS: Array<{
  id: Tool;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "lesson", label: "Lesson Planner", icon: BookOpen },
  { id: "questions", label: "Question Generator", icon: ClipboardList },
  { id: "comment", label: "Report Comments", icon: UserPlus },
  { id: "tutor", label: "AI Tutor", icon: MessageCircle },
  { id: "recommendation", label: "Recommendations", icon: Target },
  { id: "insights", label: "Performance Insights", icon: TrendingUp },
];

function OutputBox({
  text,
  mock,
  loading,
}: {
  text: string;
  mock: boolean;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border">
        <Spinner />
      </div>
    );
  }
  if (!text) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {mock && (
          <Badge variant="secondary" className="bg-amber-500/15 text-amber-600">
            Mock output
          </Badge>
        )}
      </div>
      <pre className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm">
        {text}
      </pre>
    </div>
  );
}

export default function AiConsolePage() {
  const { user } = useAuth();
  const isStaff = user?.role !== "STUDENT" && user?.role !== "PARENT";

  const [tool, setTool] = useState<Tool>("lesson");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<{ text: string; mock: boolean } | null>(
    null,
  );

  // lesson form
  const [lesson, setLesson] = useState({
    subject: "",
    classLevel: "",
    topic: "",
    durationMinutes: 60,
  });
  // questions form
  const [questions, setQuestions] = useState({
    subject: "",
    topic: "",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    count: 5,
    saveToBank: false,
  });
  // comment form
  const [comment, setComment] = useState({
    studentName: "",
    subject: "",
    performance: "",
    context: "",
  });
  // tutor form
  const [tutor, setTutor] = useState({ subject: "", message: "" });
  // recommendation form
  const [rec, setRec] = useState({
    studentName: "",
    subject: "",
    weakAreas: "",
    goal: "",
  });
  // insights form
  const [insights, setInsights] = useState({
    classLevel: "",
    term: "",
    context: "",
  });

  async function run(endpoint: string, body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    setOutput(null);
    try {
      const { data } = await api.post<
        { mock: boolean } & Record<string, string>
      >(endpoint, body);
      const textKey = Object.keys(data).find(
        (k) => typeof data[k] === "string" && k !== "mock",
      );
      setOutput({
        text: textKey ? String(data[textKey]) : JSON.stringify(data),
        mock: Boolean(data.mock),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  function handleRun() {
    if (tool === "lesson") {
      void run("/ai/lesson-planner", lesson);
    } else if (tool === "questions") {
      void run("/ai/question-generator", {
        ...questions,
        weakAreas: undefined,
        count: Number(questions.count),
      });
    } else if (tool === "comment") {
      void run("/ai/report-comment", comment);
    } else if (tool === "tutor") {
      void run("/ai/tutor", tutor);
    } else if (tool === "recommendation") {
      void run("/ai/recommendations", {
        ...rec,
        weakAreas: rec.weakAreas
          ? rec.weakAreas.split(",").map((s) => s.trim())
          : [],
      });
    } else if (tool === "insights") {
      let context: Record<string, unknown> = {};
      try {
        context = insights.context ? JSON.parse(insights.context) : {};
      } catch {
        context = { note: insights.context };
      }
      void run("/ai/insights", { ...insights, context });
    }
  }

  if (!isStaff) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        AI tools are available to staff only.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Console</h1>
          <p className="text-sm text-muted-foreground">
            Generate lesson plans, questions, comments and insights
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Tool selector */}
        <div className="space-y-2 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTool(t.id);
                    setOutput(null);
                    setError(null);
                  }}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    tool === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "bg-background hover:bg-accent"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Form + output */}
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {TOOLS.find((t) => t.id === tool)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {tool === "lesson" && (
                <>
                  <Field label="Subject">
                    <Input
                      value={lesson.subject}
                      onChange={(e) =>
                        setLesson({ ...lesson, subject: e.target.value })
                      }
                      placeholder="Mathematics"
                    />
                  </Field>
                  <Field label="Class level">
                    <Input
                      value={lesson.classLevel}
                      onChange={(e) =>
                        setLesson({ ...lesson, classLevel: e.target.value })
                      }
                      placeholder="Primary 5"
                    />
                  </Field>
                  <Field label="Topic">
                    <Input
                      value={lesson.topic}
                      onChange={(e) =>
                        setLesson({ ...lesson, topic: e.target.value })
                      }
                      placeholder="Fractions"
                    />
                  </Field>
                  <Field label="Duration (min)">
                    <Input
                      type="number"
                      value={lesson.durationMinutes}
                      onChange={(e) =>
                        setLesson({
                          ...lesson,
                          durationMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                </>
              )}
              {tool === "questions" && (
                <>
                  <Field label="Subject">
                    <Input
                      value={questions.subject}
                      onChange={(e) =>
                        setQuestions({ ...questions, subject: e.target.value })
                      }
                      placeholder="Mathematics"
                    />
                  </Field>
                  <Field label="Topic">
                    <Input
                      value={questions.topic}
                      onChange={(e) =>
                        setQuestions({ ...questions, topic: e.target.value })
                      }
                      placeholder="Fractions"
                    />
                  </Field>
                  <Field label="Type">
                    <select
                      value={questions.type}
                      onChange={(e) =>
                        setQuestions({ ...questions, type: e.target.value })
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="MULTIPLE_CHOICE">Multiple choice</option>
                      <option value="TRUE_FALSE">True / False</option>
                      <option value="ESSAY">Essay</option>
                    </select>
                  </Field>
                  <Field label="Count">
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={questions.count}
                      onChange={(e) =>
                        setQuestions({
                          ...questions,
                          count: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={questions.saveToBank}
                      onChange={(e) =>
                        setQuestions({
                          ...questions,
                          saveToBank: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-input"
                    />
                    Save generated questions to the question bank
                  </label>
                </>
              )}
              {tool === "comment" && (
                <>
                  <Field label="Student name">
                    <Input
                      value={comment.studentName}
                      onChange={(e) =>
                        setComment({ ...comment, studentName: e.target.value })
                      }
                      placeholder="Amina"
                    />
                  </Field>
                  <Field label="Subject">
                    <Input
                      value={comment.subject}
                      onChange={(e) =>
                        setComment({ ...comment, subject: e.target.value })
                      }
                      placeholder="Mathematics"
                    />
                  </Field>
                  <Field label="Performance">
                    <Input
                      value={comment.performance}
                      onChange={(e) =>
                        setComment({ ...comment, performance: e.target.value })
                      }
                      placeholder="85% — steady improvement"
                    />
                  </Field>
                  <Field label="Context">
                    <Input
                      value={comment.context}
                      onChange={(e) =>
                        setComment({ ...comment, context: e.target.value })
                      }
                      placeholder="Consistent effort"
                    />
                  </Field>
                </>
              )}
              {tool === "tutor" && (
                <>
                  <Field label="Subject">
                    <Input
                      value={tutor.subject}
                      onChange={(e) =>
                        setTutor({ ...tutor, subject: e.target.value })
                      }
                      placeholder="Mathematics"
                    />
                  </Field>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Question</Label>
                    <textarea
                      value={tutor.message}
                      onChange={(e) =>
                        setTutor({ ...tutor, message: e.target.value })
                      }
                      className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="How do I add fractions?"
                    />
                  </div>
                </>
              )}
              {tool === "recommendation" && (
                <>
                  <Field label="Student name">
                    <Input
                      value={rec.studentName}
                      onChange={(e) =>
                        setRec({ ...rec, studentName: e.target.value })
                      }
                      placeholder="Amina"
                    />
                  </Field>
                  <Field label="Subject">
                    <Input
                      value={rec.subject}
                      onChange={(e) =>
                        setRec({ ...rec, subject: e.target.value })
                      }
                      placeholder="Mathematics"
                    />
                  </Field>
                  <Field label="Weak areas (comma separated)">
                    <Input
                      value={rec.weakAreas}
                      onChange={(e) =>
                        setRec({ ...rec, weakAreas: e.target.value })
                      }
                      placeholder="fractions, geometry"
                    />
                  </Field>
                  <Field label="Goal">
                    <Input
                      value={rec.goal}
                      onChange={(e) => setRec({ ...rec, goal: e.target.value })}
                      placeholder="Improve to distinction"
                    />
                  </Field>
                </>
              )}
              {tool === "insights" && (
                <>
                  <Field label="Class level">
                    <Input
                      value={insights.classLevel}
                      onChange={(e) =>
                        setInsights({ ...insights, classLevel: e.target.value })
                      }
                      placeholder="Primary 5"
                    />
                  </Field>
                  <Field label="Term">
                    <Input
                      value={insights.term}
                      onChange={(e) =>
                        setInsights({ ...insights, term: e.target.value })
                      }
                      placeholder="2026/2027 FIRST"
                    />
                  </Field>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Context JSON (optional)</Label>
                    <textarea
                      value={insights.context}
                      onChange={(e) =>
                        setInsights({ ...insights, context: e.target.value })
                      }
                      className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      placeholder='{"average": 62, "gradeDistribution": {"A": 5, "B": 10}}'
                    />
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <Button onClick={() => void handleRun()} disabled={loading}>
                  {loading ? "Generating..." : "Generate"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {output && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Output</CardTitle>
              </CardHeader>
              <CardContent>
                <OutputBox
                  text={output.text}
                  mock={output.mock}
                  loading={false}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
