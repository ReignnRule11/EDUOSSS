"use client";

import { BellRing, Send } from "lucide-react";
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

interface ClassOption {
  id: string;
  name: string;
}

interface AbsentLate {
  id: string;
  status: string;
  student: {
    admissionNumber: string;
    firstName: string;
    lastName: string;
    guardianName: string | null;
    guardianPhone: string | null;
    guardianEmail: string | null;
  };
  classGroup: { name: string } | null;
}

interface DailyReport {
  absentLate: AbsentLate[];
}

interface NotifyResult {
  matched: number;
  sent: number;
  failed: number;
  skipped: number;
}

interface NotificationLogItem {
  id: string;
  createdAt: string;
  subject: string;
  status: string;
  channel: string;
  recipient: string | null;
  student: { firstName: string; lastName: string; admissionNumber: string };
}

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function AttendanceAlertsPage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classGroupId, setClassGroupId] = useState("");
  const [date, setDate] = useState(today());
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ABSENT" | "LATE">(
    "ALL",
  );
  const [absentLate, setAbsentLate] = useState<AbsentLate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<NotifyResult | null>(null);
  const [log, setLog] = useState<NotificationLogItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<ClassOption[]>("/classes?limit=100")
      .then(({ data }) => setClasses(data))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date });
      if (classGroupId) params.set("classGroupId", classGroupId);
      const [{ data }, logData] = await Promise.all([
        api.get<DailyReport>(`/attendance/reports/daily?${params.toString()}`),
        api.get<NotificationLogItem[]>("/attendance/notifications?limit=25"),
      ]);
      setAbsentLate(data.absentLate);
      setLog(logData.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [date, classGroupId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleNotify() {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const { data } = await api.post<NotifyResult>("/attendance/notify", {
        date,
        ...(classGroupId ? { classGroupId } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      });
      setResult(data);
      setMessage(
        `${data.sent} notification(s) sent, ${data.skipped} skipped, ${data.failed} failed for ${date}.`,
      );
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to send notifications",
      );
    } finally {
      setSending(false);
    }
  }

  const absentCount =
    absentLate?.filter((r) => r.status === "ABSENT").length ?? 0;
  const lateCount = absentLate?.filter((r) => r.status === "LATE").length ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Absent Alerts & Parent Notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Review absent / late students and notify their guardians by email
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="space-y-1">
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Class (optional)</label>
            <select
              value={classGroupId}
              onChange={(e) => setClassGroupId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
            <label className="text-sm font-medium">Notify for</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "ALL" | "ABSENT" | "LATE")
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">Absent + late</option>
              <option value="ABSENT">Absent only</option>
              <option value="LATE">Late only</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={() => void load()}>
              Refresh
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

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          <p className="text-xs text-muted-foreground">Absent</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
          <p className="text-xs text-muted-foreground">Late</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{result ? result.sent : 0}</p>
          <p className="text-xs text-muted-foreground">Notifications sent</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4" />
            Students to alert
          </CardTitle>
          <Button
            onClick={() => void handleNotify()}
            disabled={sending || (absentLate?.length ?? 0) === 0}
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending..." : "Notify guardians"}
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="py-10 text-center">
              <Spinner className="mx-auto text-muted-foreground" />
            </div>
          ) : absentLate && absentLate.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {absentLate.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {r.student.admissionNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.student.firstName} {r.student.lastName}
                    </TableCell>
                    <TableCell>{r.classGroup?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          r.status === "ABSENT"
                            ? "bg-red-500/15 text-red-600"
                            : "bg-amber-500/15 text-amber-600"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.student.guardianName ?? "-"}</TableCell>
                    <TableCell className="text-xs">
                      {r.student.guardianEmail ??
                        (r.student.guardianPhone
                          ? `${r.student.guardianPhone} (phone)`
                          : "-")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No absent or late students on {date}.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification log</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!log ? (
            <div className="py-8 text-center">
              <Spinner className="mx-auto text-muted-foreground" />
            </div>
          ) : log.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notifications have been sent yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">
                      {item.createdAt.slice(0, 16).replace("T", " ")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.student.firstName} {item.student.lastName}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs">
                      {item.subject}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.channel}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          item.status === "SENT"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : item.status === "FAILED"
                              ? "bg-red-500/15 text-red-600"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
