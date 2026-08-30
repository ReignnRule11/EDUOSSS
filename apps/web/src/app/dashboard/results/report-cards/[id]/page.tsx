"use client";

import { ArrowLeft, CheckCircle2, Download, Send } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadCsv } from "@/lib/download";

interface SubjectResult {
  subject: { id: string; name: string; code: string; credits: number };
  caScore: number | null;
  examScore: number | null;
  totalScore: number | null;
  letterGrade: string | null;
  gpa: number | null;
  remark: string | null;
}

interface TermResult {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "RELEASED";
  academicYear: string;
  term: string;
  caWeight: number;
  examWeight: number;
  totalScore: number | null;
  totalMaxScore: number | null;
  average: number | null;
  classPosition: number | null;
  classSize: number | null;
  teacherComment: string | null;
  principalComment: string | null;
  approvedAt: string | null;
  approvedBy: { firstName: string; lastName: string } | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
  classGroup: { name: string };
  subjects: SubjectResult[];
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-500/15 text-slate-600",
  SUBMITTED: "bg-blue-500/15 text-blue-600",
  APPROVED: "bg-amber-500/15 text-amber-600",
  RELEASED: "bg-emerald-500/15 text-emerald-600",
};

export default function ReportCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [result, setResult] = useState<TermResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacherComment, setTeacherComment] = useState("");
  const [principalComment, setPrincipalComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<TermResult>(`/term-results/${id}`);
      setResult(data);
      setTeacherComment(data.teacherComment ?? "");
      setPrincipalComment(data.principalComment ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveComments() {
    await run(() =>
      api.patch(`/term-results/${id}/comments`, {
        teacherComment: teacherComment || undefined,
        principalComment: principalComment || undefined,
      }),
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/results/report-cards"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to report cards
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
      ) : result ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Report Card — {result.student.firstName}{" "}
                {result.student.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {result.classGroup.name} · {result.academicYear} · {result.term}{" "}
                · {result.student.admissionNumber}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className={STATUS_STYLE[result.status]}
              >
                {result.status}
              </Badge>
              {result.average !== null && (
                <div className="text-right">
                  <div className="text-2xl font-bold">{result.average}</div>
                  <div className="text-xs text-muted-foreground">
                    Average
                    {result.classPosition
                      ? ` · ${result.classPosition}/${result.classSize}`
                      : ""}
                  </div>
                </div>
              )}
              {result.status !== "DRAFT" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    void downloadCsv(
                      `/term-results/${result.id}/export`,
                      `report-card-${result.student.admissionNumber}.pdf`,
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" /> PDF
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subject scores</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium">Subject</th>
                    <th className="px-3 py-2 text-center font-medium">
                      CA ({Math.round(result.caWeight * 100)}%)
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      Exam ({Math.round(result.examWeight * 100)}%)
                    </th>
                    <th className="px-3 py-2 text-center font-medium">Total</th>
                    <th className="px-3 py-2 text-center font-medium">Grade</th>
                    <th className="px-3 py-2 text-center font-medium">GPA</th>
                    <th className="px-3 py-2 text-left font-medium">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {result.subjects.map((s) => (
                    <tr key={s.subject.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">
                        {s.subject.name}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {s.caScore ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {s.examScore ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">
                        {s.totalScore ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">
                        {s.letterGrade ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-center">{s.gpa ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {s.remark}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="px-3 py-2 font-semibold" colSpan={3}>
                      Totals
                    </td>
                    <td className="px-3 py-2 text-center font-semibold">
                      {result.totalScore} / {result.totalMaxScore}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {!isStudent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comments & workflow</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Teacher comment</label>
                  <textarea
                    value={teacherComment}
                    onChange={(e) => setTeacherComment(e.target.value)}
                    disabled={result.status === "RELEASED"}
                    className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Principal comment
                  </label>
                  <textarea
                    value={principalComment}
                    onChange={(e) => setPrincipalComment(e.target.value)}
                    disabled={result.status === "RELEASED"}
                    className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <Button
                    variant="outline"
                    onClick={() => void handleSaveComments()}
                    disabled={busy || result.status === "RELEASED"}
                  >
                    Save comments
                  </Button>
                  {result.status === "DRAFT" && (
                    <Button
                      onClick={() =>
                        void run(() =>
                          api.post(`/term-results/${id}/submit`, {}),
                        )
                      }
                      disabled={busy}
                    >
                      <Send className="mr-2 h-4 w-4" /> Submit for approval
                    </Button>
                  )}
                  {result.status === "SUBMITTED" && (
                    <Button
                      onClick={() =>
                        void run(() =>
                          api.post(`/term-results/${id}/approve`, {}),
                        )
                      }
                      disabled={busy}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  )}
                  {result.status === "APPROVED" && (
                    <Button
                      onClick={() =>
                        void run(() =>
                          api.post(`/term-results/${id}/release`, {}),
                        )
                      }
                      disabled={busy}
                    >
                      Release to students
                    </Button>
                  )}
                  {result.approvedBy && (
                    <p className="self-center text-xs text-muted-foreground">
                      Approved by {result.approvedBy.firstName}{" "}
                      {result.approvedBy.lastName}
                      {result.approvedAt
                        ? ` on ${new Date(result.approvedAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {(result.teacherComment || result.principalComment) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {result.teacherComment && (
                <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Teacher comment
                  </p>
                  <p className="mt-1">{result.teacherComment}</p>
                </div>
              )}
              {result.principalComment && (
                <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Principal comment
                  </p>
                  <p className="mt-1">{result.principalComment}</p>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
