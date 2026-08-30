"use client";

import { Download, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadCsv } from "@/lib/download";

interface SubjectRow {
  subject: { name: string };
  totalScore: number | null;
  letterGrade: string | null;
}

interface TermBlock {
  id: string;
  academicYear: string;
  term: string;
  classGroup: { name: string };
  average: number | null;
  subjects: SubjectRow[];
}

interface Transcript {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
  cumulativeAverage: number | null;
  termsCount: number;
  results: TermBlock[];
}

export default function TranscriptsPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [studentId, setStudentId] = useState("");
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Transcript>(`/transcripts/${studentId}`);
      setTranscript(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load transcript",
      );
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  // Students/parents auto-resolve their linked student id, then load.
  useEffect(() => {
    if (!isStudent) return;
    api
      .get<Array<{ student: { id: string } }>>("/term-results?limit=1")
      .then(({ data }) => {
        if (data.length > 0) setStudentId(data[0]!.student.id);
      })
      .catch(() => {
        // no results yet
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent]);

  useEffect(() => {
    if (studentId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transcripts</h1>
        <p className="text-sm text-muted-foreground">
          {isStudent
            ? "Your cumulative academic record"
            : "View cumulative academic records for a student"}
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
            <CardTitle className="text-base">Find a student</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label>Student id</Label>
              <Input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Paste the student id from the students list"
              />
            </div>
            <Button
              onClick={() => void load()}
              disabled={!studentId || loading}
            >
              <Search className="mr-2 h-4 w-4" /> Load
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : transcript ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {transcript.student.firstName} {transcript.student.lastName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {transcript.student.admissionNumber} ·{" "}
                    {transcript.termsCount} term(s)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {transcript.cumulativeAverage !== null && (
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {transcript.cumulativeAverage}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cumulative average
                      </div>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={() =>
                      void downloadCsv(
                        `/transcripts/${transcript.student.id}/export`,
                        `transcript-${transcript.student.admissionNumber}.pdf`,
                      )
                    }
                  >
                    <Download className="mr-2 h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {transcript.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No approved or released results yet.
            </p>
          ) : (
            transcript.results.map((t) => (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {t.academicYear} · {t.term}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {t.classGroup.name}
                      </span>
                    </CardTitle>
                    <Badge variant="secondary">
                      Average: {t.average ?? "—"}
                    </Badge>
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
                        {t.subjects.map((s) => (
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
        </>
      ) : null}
    </div>
  );
}
