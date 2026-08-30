"use client";

import { Download, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { downloadCsv } from "@/lib/download";
import { cn } from "@/lib/utils";

interface Teacher {
  id: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

interface DailyReport {
  totalActive: number;
  totalMarked: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  halfDay: number;
  presentRate: number;
  items: Array<{
    teacherId: string;
    name: string;
    staffNumber: string;
    status: string;
    checkInAt: string | null;
  }>;
}

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY"] as const;

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function TeacherAttendancePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [date, setDate] = useState(today());
  const [records, setRecords] = useState<Record<string, string>>({});
  const [checkIn, setCheckIn] = useState<Record<string, string>>({});
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: teacherData }, { data: reportData }] = await Promise.all([
        api.get<Teacher[]>("/teachers?limit=100"),
        api.get<DailyReport>(`/teacher-attendance/reports/daily?date=${date}`),
      ]);
      setTeachers(teacherData);
      setReport(reportData);
      const next: Record<string, string> = {};
      const times: Record<string, string> = {};
      for (const item of reportData.items) {
        next[item.teacherId] = item.status;
        if (item.checkInAt) {
          times[item.teacherId] = new Date(item.checkInAt)
            .toISOString()
            .slice(0, 16);
        }
      }
      setRecords(next);
      setCheckIn(times);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    let saved = 0;
    try {
      for (const [teacherId, status] of Object.entries(records)) {
        if (!status) continue;
        await api.post("/teacher-attendance", {
          teacherId,
          date,
          status,
          checkInAt: checkIn[teacherId]
            ? new Date(checkIn[teacherId]).toISOString()
            : undefined,
        });
        saved += 1;
      }
      setMessage(`Saved attendance for ${saved} teacher(s).`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save attendance",
      );
    } finally {
      setSaving(false);
    }
  }

  const stats = report
    ? [
        { label: "Active", value: report.totalActive },
        { label: "Marked", value: report.totalMarked },
        { label: "Present", value: report.present },
        { label: "Absent", value: report.absent },
        { label: "Late", value: report.late },
        { label: "Rate", value: `${report.presentRate}%` },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Teacher Attendance
          </h1>
          <p className="text-sm text-muted-foreground">
            Daily staff presence, check-in times and absence tracking
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv(
              `/teacher-attendance/export?from=${date}&to=${date}`,
              `teacher-attendance-${date}.csv`,
            ).catch((err: Error) => setError(err.message))
          }
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
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
              variant="secondary"
              onClick={() => void load()}
              disabled={loading}
            >
              Reload
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

      {stats.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border p-3 text-center">
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Mark staff presence</CardTitle>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || loading}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save attendance"}
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center">
                    <Spinner className="mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : (
                teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-mono text-xs">
                      {teacher.staffNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      {teacher.firstName} {teacher.lastName}
                      {!teacher.isActive && (
                        <Badge variant="secondary" className="ml-2">
                          INACTIVE
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <select
                        value={records[teacher.id] ?? ""}
                        onChange={(e) =>
                          setRecords((prev) => ({
                            ...prev,
                            [teacher.id]: e.target.value,
                          }))
                        }
                        className={cn(
                          "h-8 rounded-md border bg-background px-2 text-xs font-semibold",
                          records[teacher.id]
                            ? "border-input text-foreground"
                            : "border-input text-muted-foreground",
                        )}
                      >
                        <option value="">—</option>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <input
                        type="datetime-local"
                        value={checkIn[teacher.id] ?? ""}
                        onChange={(e) =>
                          setCheckIn((prev) => ({
                            ...prev,
                            [teacher.id]: e.target.value,
                          }))
                        }
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
