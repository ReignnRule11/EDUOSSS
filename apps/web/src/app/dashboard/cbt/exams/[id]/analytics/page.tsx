"use client";

import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface Analytics {
  totalAttempts: number;
  gradedAttempts: number;
  maxPossibleScore: number;
  avgScore: number;
  passRate: number;
  attemptedDistribution: { inProgress: number; graded: number };
}

export default function CbtExamAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Analytics>(
        `/exams/${id}/attempts/analytics`,
      );
      setAnalytics(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load analytics",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Link
        href={`/dashboard/cbt/exams/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to exam
      </Link>

      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Exam Analytics</h1>
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
      ) : analytics ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Total attempts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.totalAttempts}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.attemptedDistribution.inProgress} in progress ·{" "}
                {analytics.attemptedDistribution.graded} graded
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Average score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.avgScore}
                <span className="text-base text-muted-foreground">
                  {" "}
                  / {analytics.maxPossibleScore}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                across graded attempts
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pass rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.passRate}%</div>
              <p className="text-xs text-muted-foreground">
                scored at or above the pass mark
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
