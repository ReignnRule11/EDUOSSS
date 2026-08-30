"use client";

import { Award, FileSpreadsheet, GraduationCap, Table2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface TermResultItem {
  id: string;
  status: string;
  average: number | null;
  classPosition: number | null;
  academicYear: string;
  term: string;
  classGroup: { name: string };
  student: { firstName: string; lastName: string; admissionNumber: string };
}

export default function ResultsOverviewPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [results, setResults] = useState<TermResultItem[]>([]);
  const [scales, setScales] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, s] = await Promise.all([
        api.get<TermResultItem[]>("/term-results?limit=50"),
        isStudent
          ? Promise.resolve({ data: [] as unknown[] })
          : api.get<unknown[]>("/result-scales"),
      ]);
      setResults(r.data);
      setScales(s.data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load results",
      );
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
        <h1 className="text-2xl font-bold tracking-tight">Results Overview</h1>
        <p className="text-sm text-muted-foreground">
          {isStudent
            ? "Review your report cards and academic transcript"
            : "Manage continuous assessment, examinations and report cards"}
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
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Term results
                </CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.length}</div>
                <p className="text-xs text-muted-foreground">
                  {isStudent ? "your term results" : "across all students"}
                </p>
              </CardContent>
            </Card>
            {!isStudent && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Grading scales
                  </CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{scales.length}</div>
                  <p className="text-xs text-muted-foreground">
                    custom grading configurations
                  </p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Transcript
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">—</div>
                <p className="text-xs text-muted-foreground">
                  cumulative across terms
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {isStudent ? (
              <>
                <Link
                  href="/dashboard/results/report-cards"
                  className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    My report cards
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    View scores, grades, comments and download PDFs
                  </p>
                </Link>
                <Link
                  href="/dashboard/results/transcripts"
                  className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    My transcript
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cumulative academic record
                  </p>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard/results/broadsheet"
                  className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Table2 className="h-5 w-5 text-primary" />
                    Broadsheet entry
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter CA and exam scores per class
                  </p>
                </Link>
                <Link
                  href="/dashboard/results/scales"
                  className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Award className="h-5 w-5 text-primary" />
                    Grading scales
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Configure grade boundaries and GPA
                  </p>
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
