"use client";

import { CalendarCheck2, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ClassOption {
  id: string;
  name: string;
}

interface RosterStudent {
  studentId: string;
  admissionNumber: string;
  name: string;
  status: string | null;
}

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "border-emerald-500 bg-emerald-500/15 text-emerald-700",
  ABSENT: "border-red-500 bg-red-500/15 text-red-700",
  LATE: "border-amber-500 bg-amber-500/15 text-amber-700",
  EXCUSED: "border-blue-500 bg-blue-500/15 text-blue-700",
};

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function StudentAttendancePage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classGroupId, setClassGroupId] = useState("");
  const [date, setDate] = useState(today());
  const [roster, setRoster] = useState<RosterStudent[] | null>(null);
  const [records, setRecords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<ClassOption[]>("/classes?limit=100")
      .then(({ data }) => setClasses(data))
      .catch(() => {});
  }, []);

  const loadRoster = useCallback(async () => {
    if (!classGroupId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { data } = await api.get<{ students: RosterStudent[] }>(
        `/attendance/qr/sheet?classGroupId=${encodeURIComponent(classGroupId)}&date=${date}`,
      );
      setRoster(data.students);
      const next: Record<string, string> = {};
      for (const s of data.students) {
        if (s.status) next[s.studentId] = s.status;
      }
      setRecords(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, [classGroupId, date]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };
    for (const status of Object.values(records)) {
      counts[status] = (counts[status] ?? 0) + 1;
    }
    const total = roster?.length ?? 0;
    const marked = Object.keys(records).length;
    return {
      PRESENT: counts.PRESENT,
      ABSENT: counts.ABSENT,
      LATE: counts.LATE,
      EXCUSED: counts.EXCUSED,
      total,
      marked,
    };
  }, [records, roster]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        classGroupId,
        date,
        records: Object.entries(records).map(([studentId, status]) => ({
          studentId,
          status,
        })),
      };
      const { data } = await api.post<{ created: number; updated: number }>(
        "/attendance",
        payload,
      );
      setMessage(
        `Saved: ${data.created} new, ${data.updated} updated for ${date}.`,
      );
      await loadRoster();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save attendance",
      );
    } finally {
      setSaving(false);
    }
  }

  function setStatus(studentId: string, status: string) {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Student Attendance
        </h1>
        <p className="text-sm text-muted-foreground">
          Record attendance for a class on a date
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1">
            <label className="text-sm font-medium">Class</label>
            <select
              value={classGroupId}
              onChange={(e) => setClassGroupId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => void loadRoster()}
              disabled={!classGroupId || loading}
            >
              <CalendarCheck2 className="h-4 w-4" />
              Load roster
            </Button>
          </div>
        </CardContent>
      </Card>

      {message && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {summary.total > 0 && (
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{summary.total}</p>
            <p className="text-xs text-muted-foreground">Enrolled</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-500/5 p-3 text-center">
            <p className="text-xl font-bold text-emerald-600">
              {summary.PRESENT}
            </p>
            <p className="text-xs text-muted-foreground">Present</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-500/5 p-3 text-center">
            <p className="text-xl font-bold text-red-600">{summary.ABSENT}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-500/5 p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{summary.LATE}</p>
            <p className="text-xs text-muted-foreground">Late</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-500/5 p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{summary.EXCUSED}</p>
            <p className="text-xs text-muted-foreground">Excused</p>
          </div>
        </div>
      )}

      {roster && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              Mark attendance · {summary.marked}/{summary.total} marked
            </CardTitle>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || summary.marked === 0}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save attendance"}
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead colSpan={4} className="text-right">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <Spinner className="mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : (
                  roster.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-mono text-xs">
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell colSpan={4}>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {STATUSES.map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() =>
                                setStatus(student.studentId, status)
                              }
                              className={cn(
                                "rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
                                records[student.studentId] === status
                                  ? STATUS_STYLES[status]
                                  : "border-input text-muted-foreground hover:bg-accent",
                              )}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!roster && !loading && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Select a class and load the roster to begin.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
