"use client";

import {
  BookOpen,
  ClipboardList,
  FileSpreadsheet,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function CbtOverviewPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [stats, setStats] = useState<{
    questions: number;
    exams: number;
    attempts: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, e, a] = await Promise.all([
        api.get<unknown[]>("/questions?limit=1"),
        api.get<unknown[]>("/exams?limit=1"),
        isStudent
          ? api.get<unknown[]>("/attempts/mine?limit=1")
          : Promise.resolve({ meta: { totalItems: 0 } as never }),
      ]);
      setStats({
        questions: (q.meta?.totalItems as number) ?? 0,
        exams: (e.meta?.totalItems as number) ?? 0,
        attempts: (a.meta?.totalItems as number) ?? 0,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [isStudent]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CBT Overview</h1>
        <p className="text-sm text-muted-foreground">
          {isStudent
            ? "Take exams, track attempts and review results"
            : "Manage the question bank, exams and grading"}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {!isStudent && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Question Bank
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.questions}</div>
                <p className="text-xs text-muted-foreground">
                  questions in the bank
                </p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exams</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.exams}</div>
              <p className="text-xs text-muted-foreground">
                {isStudent ? "available exams" : "created exams"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isStudent ? "My Attempts" : "Attempts"}
              </CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.attempts}</div>
              <p className="text-xs text-muted-foreground">
                {isStudent ? "submitted or in progress" : "across all exams"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {isStudent ? (
          <Link
            href="/dashboard/cbt/exams"
            className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <PlayCircle className="h-5 w-5 text-primary" />
              Take an exam
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse published exams and start an attempt
            </p>
          </Link>
        ) : (
          <>
            <Link
              href="/dashboard/cbt/questions"
              className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="h-5 w-5 text-primary" />
                Manage question bank
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Create categories and the five supported question types
              </p>
            </Link>
            <Link
              href="/dashboard/cbt/exams"
              className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardList className="h-5 w-5 text-primary" />
                Manage exams
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Build exams, randomize questions, publish and grade
              </p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
