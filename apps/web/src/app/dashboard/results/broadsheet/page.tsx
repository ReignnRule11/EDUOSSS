"use client";

import { Save, Table2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface ClassGroup {
  id: string;
  name: string;
}

interface BroadsheetData {
  classGroupName: string;
  academicYear: string;
  term: string;
  subjects: Array<{ id: string; name: string; code: string }>;
  rows: Array<{
    studentId: string;
    studentName: string;
    admissionNumber: string;
    status: string;
    average: number | null;
    classPosition: number | null;
    subjects: Record<
      string,
      { totalScore: number | null; letterGrade: string | null }
    >;
  }>;
}

export default function BroadsheetPage() {
  const { user } = useAuth();
  const canManage = user?.role !== "STUDENT" && user?.role !== "PARENT";

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [classGroupId, setClassGroupId] = useState("");
  const [academicYear, setAcademicYear] = useState("2026/2027");
  const [term, setTerm] = useState("FIRST");
  const [sheet, setSheet] = useState<BroadsheetData | null>(null);
  const [scores, setScores] = useState<
    Record<string, Record<string, { ca: string; exam: string }>>
  >({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    try {
      const { data } = await api.get<ClassGroup[]>("/classes?limit=100");
      setClasses(data);
    } catch {
      // optional
    }
  }, []);

  useEffect(() => {
    if (canManage) void loadClasses();
  }, [canManage, loadClasses]);

  async function loadSheet() {
    if (!classGroupId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await api.get<BroadsheetData>(
        `/result-insights/broadsheet?classGroupId=${classGroupId}&academicYear=${encodeURIComponent(academicYear)}&term=${term}`,
      );
      setSheet(data);
      // Pre-fill the entry grid from existing totals.
      const prefilled: typeof scores = {};
      for (const row of data.rows) {
        prefilled[row.studentId] = {};
        for (const s of data.subjects) {
          prefilled[row.studentId]![s.id] = { ca: "", exam: "" };
        }
      }
      setScores(prefilled);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load broadsheet",
      );
    } finally {
      setLoading(false);
    }
  }

  /** Creates a term result for a student (ignore if exists) then saves scores. */
  async function saveRow(studentId: string, resultId: string | null) {
    let id = resultId;
    if (!id) {
      try {
        const created = await api.post<{ id: string }>("/term-results", {
          studentId,
          classGroupId,
          academicYear,
          term,
        });
        id = created.data.id;
      } catch {
        // exists already -> look it up
        const found = await api.get<Array<{ id: string; studentId: string }>>(
          `/term-results?classGroupId=${classGroupId}&academicYear=${encodeURIComponent(academicYear)}&term=${term}`,
        );
        const match = found.data.find((r) => r.studentId === studentId);
        if (!match) throw new Error("Could not create or find term result");
        id = match.id;
      }
    }
    const row = scores[studentId] ?? {};
    const payload = Object.entries(row)
      .filter(([, v]) => v.ca !== "" || v.exam !== "")
      .map(([subjectId, v]) => ({
        subjectId,
        caScore: v.ca === "" ? undefined : Number(v.ca),
        examScore: v.exam === "" ? undefined : Number(v.exam),
      }));
    if (payload.length > 0) {
      await api.post(`/term-results/${id}/scores`, { scores: payload });
      await api.post(`/term-results/${id}/compute`, {});
    }
    return id;
  }

  async function handleSaveAll() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const resultIds = new Map<string, string | null>();
      const existing = sheet?.rows ?? [];
      // Resolve existing term result ids once.
      const listRes = await api.get<Array<{ id: string; studentId: string }>>(
        `/term-results?classGroupId=${classGroupId}&academicYear=${encodeURIComponent(academicYear)}&term=${term}`,
      );
      for (const r of listRes.data) resultIds.set(r.studentId, r.id);

      let saved = 0;
      for (const row of existing) {
        const hasInput = Object.values(scores[row.studentId] ?? {}).some(
          (v) => v.ca !== "" || v.exam !== "",
        );
        if (!hasInput) continue;
        await saveRow(row.studentId, resultIds.get(row.studentId) ?? null);
        saved += 1;
      }
      setSuccess(`Saved scores for ${saved} student(s).`);
      await loadSheet();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save scores");
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        You do not have permission to manage broadsheets.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Broadsheet</h1>
        <p className="text-sm text-muted-foreground">
          Enter continuous assessment (CA) and examination scores for a class
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select class & term</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Class</label>
            <select
              value={classGroupId}
              onChange={(e) => setClassGroupId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select class</option>
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
          <Button
            onClick={() => void loadSheet()}
            disabled={!classGroupId || loading}
          >
            <Table2 className="mr-2 h-4 w-4" /> Load broadsheet
          </Button>
          {sheet && (
            <Button
              variant="outline"
              onClick={() => void handleSaveAll()}
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save all scores"}
            </Button>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : sheet ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {sheet.classGroupName} · {sheet.academicYear} · {sheet.term}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left font-medium">Student</th>
                    {sheet.subjects.map((s) => (
                      <th
                        key={s.id}
                        className="px-2 py-2 text-center font-medium"
                      >
                        {s.name}
                        <div className="text-xs font-normal text-muted-foreground">
                          CA / Exam
                        </div>
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center font-medium">Avg</th>
                    <th className="px-2 py-2 text-center font-medium">Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.map((row) => (
                    <tr key={row.studentId} className="border-b">
                      <td className="px-2 py-2">
                        <div className="font-medium">{row.studentName}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.admissionNumber}
                        </div>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {row.status}
                        </Badge>
                      </td>
                      {sheet.subjects.map((s) => {
                        const existing = row.subjects[s.id];
                        const cell = scores[row.studentId]?.[s.id];
                        return (
                          <td key={s.id} className="px-2 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={cell?.ca ?? ""}
                                placeholder={
                                  existing?.totalScore?.toString() ?? "CA"
                                }
                                onChange={(e) =>
                                  setScores((prev) => ({
                                    ...prev,
                                    [row.studentId]: {
                                      ...(prev[row.studentId] ?? {}),
                                      [s.id]: {
                                        ca: e.target.value,
                                        exam:
                                          prev[row.studentId]?.[s.id]?.exam ??
                                          "",
                                      },
                                    },
                                  }))
                                }
                                className="w-14 rounded border border-input bg-background px-1 py-1 text-center text-xs"
                              />
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={cell?.exam ?? ""}
                                placeholder="EXAM"
                                onChange={(e) =>
                                  setScores((prev) => ({
                                    ...prev,
                                    [row.studentId]: {
                                      ...(prev[row.studentId] ?? {}),
                                      [s.id]: {
                                        ca:
                                          prev[row.studentId]?.[s.id]?.ca ?? "",
                                        exam: e.target.value,
                                      },
                                    },
                                  }))
                                }
                                className="w-14 rounded border border-input bg-background px-1 py-1 text-center text-xs"
                              />
                            </div>
                            {existing?.letterGrade && (
                              <div className="mt-1 text-center text-xs font-semibold text-muted-foreground">
                                {existing.totalScore} ({existing.letterGrade})
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-semibold">
                        {row.average ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {row.classPosition ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
