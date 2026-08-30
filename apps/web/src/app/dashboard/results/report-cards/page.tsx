"use client";

import { Download, ScrollText } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadCsv } from "@/lib/download";

interface TermResultItem {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "RELEASED";
  average: number | null;
  totalScore: number | null;
  classPosition: number | null;
  classSize: number | null;
  academicYear: string;
  term: string;
  classGroup: { name: string };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-500/15 text-slate-600",
  SUBMITTED: "bg-blue-500/15 text-blue-600",
  APPROVED: "bg-amber-500/15 text-amber-600",
  RELEASED: "bg-emerald-500/15 text-emerald-600",
};

export default function ReportCardsPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [results, setResults] = useState<TermResultItem[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [classGroupId, setClassGroupId] = useState("");
  const [academicYear, setAcademicYear] = useState("2026/2027");
  const [term, setTerm] = useState("FIRST");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (!isStudent) {
        if (classGroupId) params.set("classGroupId", classGroupId);
        params.set("academicYear", academicYear);
        params.set("term", term);
      }
      const { data } = await api.get<TermResultItem[]>(
        `/term-results?${params.toString()}`,
      );
      setResults(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load results",
      );
    } finally {
      setLoading(false);
    }
  }, [isStudent, classGroupId, academicYear, term]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadClasses = useCallback(async () => {
    try {
      const { data } =
        await api.get<Array<{ id: string; name: string }>>(
          "/classes?limit=100",
        );
      setClasses(data);
    } catch {
      // optional
    }
  }, []);

  useEffect(() => {
    if (!isStudent) void loadClasses();
  }, [isStudent, loadClasses]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Report Cards</h1>
        <p className="text-sm text-muted-foreground">
          {isStudent
            ? "Your published report cards"
            : "View, approve and release term report cards"}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!isStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Class</label>
              <select
                value={classGroupId}
                onChange={(e) => setClassGroupId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Academic year</label>
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="FIRST">First</option>
                <option value="SECOND">Second</option>
                <option value="THIRD">Third</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No report cards found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    {r.student.firstName} {r.student.lastName}
                  </CardTitle>
                  <Badge variant="secondary" className={STATUS_STYLE[r.status]}>
                    {r.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.classGroup.name} · {r.academicYear} · {r.term} ·{" "}
                  {r.student.admissionNumber}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="text-xs text-muted-foreground">
                  Average:{" "}
                  <span className="font-semibold text-foreground">
                    {r.average ?? "—"}
                  </span>
                  {" · "}Total: {r.totalScore ?? "—"}
                  {r.classPosition ? (
                    <>
                      {" "}
                      · Position: {r.classPosition}/{r.classSize}
                    </>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/results/report-cards/${r.id}`}
                    className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <ScrollText className="mr-1 inline h-4 w-4" /> View
                  </Link>
                  {r.status !== "DRAFT" && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        void downloadCsv(
                          `/term-results/${r.id}/export`,
                          `report-card-${r.student.admissionNumber}.pdf`,
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
