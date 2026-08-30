"use client";

import { ArrowLeft, Award, Download } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { downloadCsv } from "@/lib/download";

interface SubjectResult {
  subject: { name: string };
  totalScore: number | null;
  letterGrade: string | null;
}

interface TermResult {
  id: string;
  academicYear: string;
  term: string;
  average: number | null;
  totalScore: number | null;
  classPosition: number | null;
  classGroup: { name: string };
  subjects: SubjectResult[];
}

export default function ChildResultsPage() {
  const { childId } = useParams<{ childId: string }>();
  const [results, setResults] = useState<TermResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<TermResult[]>(
        `/parent/children/${childId}/results`,
      );
      setResults(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load results",
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
        <Award className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Results</h1>
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
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No approved or released results yet.
        </p>
      ) : (
        results.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {r.academicYear} · {r.term}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {r.classGroup.name}
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  {r.average !== null && (
                    <Badge variant="secondary">
                      Average: {r.average}
                      {r.classPosition ? ` · Pos ${r.classPosition}` : ""}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void downloadCsv(
                        `/term-results/${r.id}/export`,
                        `report-card-${childId}.pdf`,
                      )
                    }
                  >
                    <Download className="mr-1 h-3 w-3" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-1.5 text-left font-medium">
                        Subject
                      </th>
                      <th className="px-3 py-1.5 text-center font-medium">
                        Total
                      </th>
                      <th className="px-3 py-1.5 text-center font-medium">
                        Grade
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.subjects.map((s) => (
                      <tr
                        key={s.subject.name}
                        className="border-b last:border-0"
                      >
                        <td className="px-3 py-1.5">{s.subject.name}</td>
                        <td className="px-3 py-1.5 text-center">
                          {s.totalScore ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-center font-semibold">
                          {s.letterGrade ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
