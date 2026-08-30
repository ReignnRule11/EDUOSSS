"use client";

import { AlertTriangle, ArrowLeft, Clock, Download } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadCsv } from "@/lib/download";

interface Question {
  id: string;
  type: string;
  body: string;
  points: number;
  options: unknown;
  correctAnswer?: unknown;
  explanation?: string | null;
  result?: {
    score: number;
    maxPoints: number;
    feedback?: string;
  } | null;
}

interface Attempt {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED" | "GRADED";
  totalScore: number | null;
  autoScore: number;
  essayScore: number;
  percentageScore?: number;
  passed?: boolean;
  startedAt: string;
  submittedAt: string | null;
  expiresAt: string;
  answers: Record<string, unknown>;
  questions?: Question[];
  results?: Record<
    string,
    { score: number; maxPoints: number; feedback?: string }
  >;
  exam: { title: string; passMark: number; showResultsOnSubmit: boolean };
}

const ANSWER_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function MCQOptions({
  question,
  value,
  onChange,
  readOnly,
}: {
  question: Question;
  value: unknown;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  const options = Array.isArray(question.options) ? question.options : [];
  return (
    <div className="space-y-2">
      {(options as Array<{ id: string; text: string }>).map((opt, i) => {
        const selected = value === opt.id;
        const correct =
          readOnly &&
          (question.correctAnswer as { optionId?: string })?.optionId ===
            opt.id;
        const showCorrect =
          readOnly &&
          question.result?.score === question.result?.maxPoints &&
          false;
        void showCorrect;
        return (
          <label
            key={opt.id}
            className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
              selected ? "border-primary bg-primary/5" : ""
            } ${correct ? "border-emerald-500 bg-emerald-500/10" : ""}`}
          >
            <input
              type="radio"
              name={question.id}
              checked={selected}
              disabled={readOnly}
              onChange={() => onChange(opt.id)}
              className="mt-0.5"
            />
            <span className="font-semibold">{ANSWER_LABELS[i]}.</span>
            <span>{opt.text}</span>
          </label>
        );
      })}
    </div>
  );
}

function renderAnswerControl(
  question: Question,
  value: unknown,
  setValue: (v: unknown) => void,
  readOnly: boolean,
) {
  switch (question.type) {
    case "MULTIPLE_CHOICE":
      return (
        <MCQOptions
          question={question}
          value={value}
          onChange={(v) => setValue(v)}
          readOnly={readOnly}
        />
      );
    case "TRUE_FALSE":
      return (
        <div className="flex gap-3">
          {[true, false].map((b) => (
            <label
              key={String(b)}
              className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm ${
                value === b ? "border-primary bg-primary/5" : ""
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === b}
                disabled={readOnly}
                onChange={() => setValue(b)}
              />
              {b ? "True" : "False"}
            </label>
          ))}
        </div>
      );
    case "FILL_BLANK":
      return (
        <textarea
          value={Array.isArray(value) ? value.join("\n") : String(value ?? "")}
          disabled={readOnly}
          onChange={(e) =>
            setValue(
              e.target.value
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean),
            )
          }
          placeholder="One answer per line (match the number of blanks)"
          className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      );
    case "MATCHING": {
      const options = (question.options ?? {}) as {
        left?: Array<{ id: string; text: string }>;
        right?: Array<{ id: string; text: string }>;
      };
      const mapping = (value ?? {}) as Record<string, string>;
      return (
        <div className="space-y-2">
          {(options.left ?? []).map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              <span className="w-1/2 rounded-md border bg-muted/30 px-3 py-2">
                {item.text}
              </span>
              <select
                value={mapping[item.id] ?? ""}
                disabled={readOnly}
                onChange={(e) =>
                  setValue({ ...mapping, [item.id]: e.target.value })
                }
                className="h-9 w-1/2 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— match —</option>
                {(options.right ?? []).map((r, ri) => (
                  <option key={r.id} value={r.id}>
                    {ANSWER_LABELS[ri]}. {r.text}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }
    case "ESSAY":
      return (
        <textarea
          value={String(value ?? "")}
          disabled={readOnly}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write your answer here"
          className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      );
    default:
      return null;
  }
}

export default function CbtAttemptPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Attempt>(`/attempts/${id}`);
      setAttempt(data);
      setAnswers(data.answers ?? {});
      if (data.expiresAt) {
        setTimeLeft(
          Math.max(
            0,
            Math.floor(
              (new Date(data.expiresAt).getTime() - Date.now()) / 1000,
            ),
          ),
        );
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load attempt",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isLive = attempt?.status === "IN_PROGRESS";

  // Countdown + auto-submit on expiry
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          if (!submittedRef.current) {
            submittedRef.current = true;
            void (async () => {
              try {
                await api.post(`/attempts/${id}/submit`, { answers });
                await load();
              } catch {
                setError("Auto-submitted, but reloading results failed.");
              }
            })();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, id]);

  // Autosave every 30s while live
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      try {
        await api.post(`/attempts/${id}/autosave`, { answers });
        setLastSaved(new Date().toLocaleTimeString());
      } catch {
        // transient autosave failure
      }
    }, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, id, answers]);

  async function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/attempts/${id}/submit`, { answers });
      await load();
    } catch (err) {
      submittedRef.current = false;
      setError(err instanceof ApiError ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  function setValue(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  const mm = Math.floor(timeLeft / 60);
  const ss = timeLeft % 60;

  return (
    <div className="space-y-4">
      <Link
        href={
          isStudent
            ? "/dashboard/cbt/attempts"
            : `/dashboard/cbt/exams/${attempt?.exam?.title ? "" : ""}`
        }
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          if (isLive) {
            e.preventDefault();
            if (
              window.confirm(
                "Leave the exam? Your progress is saved but the timer keeps running.",
              )
            ) {
              window.location.href = "/dashboard/cbt/attempts";
            }
          }
        }}
      >
        <ArrowLeft className="h-4 w-4" /> Back
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
      ) : attempt ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {attempt.exam.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                Status: <Badge variant="secondary">{attempt.status}</Badge>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isLive && (
                <div
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
                    timeLeft < 60 ? "border-red-300 bg-red-50 text-red-600" : ""
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
                </div>
              )}
              {isLive && lastSaved && (
                <span className="text-xs text-muted-foreground">
                  Saved {lastSaved}
                </span>
              )}
              {!isLive && attempt.totalScore !== null && (
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {attempt.totalScore.toFixed(2)}
                    {attempt.percentageScore !== undefined && (
                      <span className="text-base text-muted-foreground">
                        {" "}
                        ({attempt.percentageScore}%)
                      </span>
                    )}
                  </div>
                  {attempt.passed !== undefined && (
                    <Badge
                      variant="secondary"
                      className={
                        attempt.passed
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-red-500/15 text-red-600"
                      }
                    >
                      {attempt.passed ? "Passed" : "Not passed"}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {isLive && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Your answers are auto-saved every 30 seconds. The exam submits
                automatically when the timer reaches zero.
              </p>
              <Button onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit exam"}
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {(attempt.questions ?? []).map((q, index) => {
              const value = answers[q.id];
              const result = q.result ?? attempt.results?.[q.id];
              return (
                <div
                  key={q.id}
                  className={`rounded-lg border p-4 ${
                    result
                      ? result.score >= result.maxPoints
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-red-200 bg-red-50/40"
                      : "bg-background"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {index + 1}. {q.body}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary">{q.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {q.points} pts
                      </span>
                      {result && (
                        <Badge variant="secondary">
                          {result.score.toFixed(1)}/{result.maxPoints}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {renderAnswerControl(
                    q,
                    value,
                    (v) => setValue(q.id, v),
                    !isLive,
                  )}
                  {!isLive && result?.feedback && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {result.feedback}
                    </p>
                  )}
                  {!isLive &&
                    Boolean(q.correctAnswer) &&
                    renderCorrectAnswer(q) !== "—" && (
                      <div className="mt-3 rounded-md bg-muted/40 p-3 text-xs">
                        <p className="font-semibold text-muted-foreground">
                          Correct answer
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {renderCorrectAnswer(q)}
                        </p>
                        {q.explanation && (
                          <p className="mt-1 text-muted-foreground">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    )}
                </div>
              );
            })}
          </div>

          {isStudent && !isLive && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  void downloadCsv(`/attempts/${id}/export`, `result-${id}.pdf`)
                }
              >
                <Download className="mr-2 h-4 w-4" /> Download PDF result
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function renderCorrectAnswer(q: Question) {
  const ca = q.correctAnswer as Record<string, unknown> | undefined;
  if (!ca) return "—";
  if (q.type === "MULTIPLE_CHOICE" && Array.isArray(q.options)) {
    const opt = (q.options as Array<{ id: string; text: string }>).find(
      (o) => o.id === ca.optionId,
    );
    return opt?.text ?? String(ca.optionId);
  }
  if (q.type === "TRUE_FALSE") return String(ca.value);
  if (q.type === "FILL_BLANK")
    return String((ca.answers as string[])?.join(" | "));
  if (q.type === "MATCHING") {
    const pairs =
      (ca.pairs as Array<{ leftId: string; rightId: string }>) ?? [];
    const options = (q.options ?? {}) as {
      left?: Array<{ id: string; text: string }>;
      right?: Array<{ id: string; text: string }>;
    };
    return pairs
      .map((p) => {
        const l = options.left?.find((x) => x.id === p.leftId);
        const r = options.right?.find((x) => x.id === p.rightId);
        return `${l?.text ?? p.leftId} → ${r?.text ?? p.rightId}`;
      })
      .join("; ");
  }
  return "—";
}
