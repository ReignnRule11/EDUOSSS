"use client";

import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Attempt {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED" | "GRADED";
  totalScore: number | null;
  startedAt: string;
  submittedAt: string | null;
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
    passMark: number;
  };
  student?: { id: string; firstName: string; lastName: string };
}

const STATUS_STYLE: Record<string, string> = {
  IN_PROGRESS: "bg-blue-500/15 text-blue-600",
  SUBMITTED: "bg-amber-500/15 text-amber-600",
  AUTO_SUBMITTED: "bg-amber-500/15 text-amber-600",
  GRADED: "bg-emerald-500/15 text-emerald-600",
};

export default function CbtAttemptsPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [exams, setExams] = useState<Array<{ id: string; title: string }>>([]);
  const [filterExam, setFilterExam] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isStudent) {
        const { data } = await api.get<Attempt[]>("/attempts/mine?limit=100");
        setAttempts(data);
      } else {
        const { data: examData } =
          await api.get<Array<{ id: string; title: string }>>(
            "/exams?limit=100",
          );
        setExams(examData);
        if (filterExam) {
          const { data } = await api.get<Attempt[]>(
            `/exams/${filterExam}/attempts?limit=100`,
          );
          setAttempts(data);
        } else {
          setAttempts([]);
        }
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load attempts",
      );
    } finally {
      setLoading(false);
    }
  }, [isStudent, filterExam]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isStudent ? "My Attempts" : "Attempts & Results"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isStudent
            ? "Review your exam attempts and results"
            : "Review student attempts and grade essays"}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!isStudent && exams.length > 0 && (
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterExam}
            onChange={(e) => setFilterExam(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select an exam</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Attempts ({attempts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isStudent
                  ? "You have not taken any exams yet."
                  : "Select an exam to view its attempts."}
              </p>
            ) : (
              <div className="space-y-2">
                {attempts.map((a) => (
                  <Link
                    key={a.id}
                    href={`/dashboard/cbt/attempts/${a.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium">{a.exam.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.student
                          ? `${a.student.firstName} ${a.student.lastName} · `
                          : ""}
                        Started {new Date(a.startedAt).toLocaleString()}
                        {a.submittedAt
                          ? ` · Submitted ${new Date(a.submittedAt).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.totalScore !== null && (
                        <span className="text-sm font-semibold">
                          {a.totalScore.toFixed(2)}
                        </span>
                      )}
                      <Badge
                        variant="secondary"
                        className={STATUS_STYLE[a.status]}
                      >
                        {a.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
