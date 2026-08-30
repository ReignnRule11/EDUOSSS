"use client";

import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface Assignment {
  id: string;
  courseTitle: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  maxScore: number;
  status: "PENDING" | "SUBMITTED";
  score: number | null;
  submittedAt: string | null;
}

export default function ChildAssignmentsPage() {
  const { childId } = useParams<{ childId: string }>();
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Assignment[]>(
        `/parent/children/${childId}/assignments`,
      );
      setItems(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load assignments",
      );
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/parent"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to children
      </Link>

      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
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
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No assignments found for your child.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <Badge
                    variant="secondary"
                    className={
                      a.status === "SUBMITTED"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-amber-500/15 text-amber-600"
                    }
                  >
                    {a.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {a.courseTitle}
                  {a.dueAt
                    ? ` · due ${new Date(a.dueAt).toLocaleDateString()}`
                    : ""}
                </p>
              </CardHeader>
              {a.instructions && (
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {a.instructions}
                  </p>
                  {a.score !== null && (
                    <p className="text-sm font-medium">
                      Score: {a.score}/{a.maxScore}
                    </p>
                  )}
                  {a.submittedAt && (
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(a.submittedAt).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
