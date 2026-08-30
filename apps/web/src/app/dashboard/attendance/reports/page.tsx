"use client";

import { Download } from "lucide-react";
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

interface ClassOption {
  id: string;
  name: string;
}

interface DailyRow {
  classGroupId: string;
  name: string;
  gradeLevel: string;
  enrolled: number;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  presentRate: number;
}

interface DailyReport {
  date: string;
  rows: DailyRow[];
  totals: {
    enrolled: number;
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    presentRate: number;
  };
  absentLate: Array<{
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
  }>;
}

interface MonthlyRow {
  studentId: string;
  admissionNumber: string;
  name: string;
  className: string;
  PRESENT?: number;
  ABSENT?: number;
  LATE?: number;
  EXCUSED?: number;
  totalDays: number;
  presentRate: number;
}

interface LateItem {
  id: string;
  date: string;
  admissionNumber: string;
  studentName: string;
  className: string;
  remark: string | null;
}

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function rateClass(rate: number) {
  return rate >= 90
    ? "text-emerald-600"
    : rate >= 75
      ? "text-amber-600"
      : "text-red-600";
}

export default function AttendanceReportsPage() {
  const [tab, setTab] = useState<"daily" | "monthly" | "late">("daily");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classGroupId, setClassGroupId] = useState("");

  const [date, setDate] = useState(today());
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [monthly, setMonthly] = useState<MonthlyRow[] | null>(null);
  const [monthlyMeta, setMonthlyMeta] = useState<{
    totals: {
      presentRate: number;
      present: number;
      absent: number;
      late: number;
    };
    totalItems: number;
    from?: string;
    to?: string;
  } | null>(null);
  const [monthPage, setMonthPage] = useState(1);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [late, setLate] = useState<LateItem[] | null>(null);
  const [lateLoading, setLateLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<ClassOption[]>("/classes?limit=100")
      .then(({ data }) => setClasses(data))
      .catch(() => {});
  }, []);

  const loadDaily = useCallback(async () => {
    setDailyLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date });
      if (classGroupId) params.set("classGroupId", classGroupId);
      const { data } = await api.get<DailyReport>(
        `/attendance/reports/daily?${params.toString()}`,
      );
      setDaily(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load daily report",
      );
    } finally {
      setDailyLoading(false);
    }
  }, [date, classGroupId]);

  const loadMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        month,
        year,
        page: String(monthPage),
        limit: "25",
      });
      if (classGroupId) params.set("classGroupId", classGroupId);
      const { data, meta } = await api.get<MonthlyRow[]>(
        `/attendance/reports/monthly?${params.toString()}`,
      );
      setMonthly(data);
      setMonthlyMeta(
        (meta as unknown as {
          totals: {
            presentRate: number;
            present: number;
            absent: number;
            late: number;
          };
          totalItems: number;
          from?: string;
          to?: string;
        }) ?? null,
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load monthly report",
      );
    } finally {
      setMonthlyLoading(false);
    }
  }, [month, year, classGroupId, monthPage]);

  const loadLate = useCallback(async () => {
    setLateLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      if (classGroupId) params.set("classGroupId", classGroupId);
      const { data } = await api.get<{ items: LateItem[] }>(
        `/attendance/reports/late?${params.toString()}`,
      );
      setLate(data.items);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load late arrivals",
      );
    } finally {
      setLateLoading(false);
    }
  }, [from, to, classGroupId]);

  useEffect(() => {
    if (tab === "daily") void loadDaily();
    if (tab === "monthly") void loadMonthly();
    if (tab === "late") void loadLate();
  }, [tab, loadDaily, loadMonthly, loadLate]);

  const exportDaily = () =>
    downloadCsv(
      `/attendance/export?date=${date}${classGroupId ? `&classGroupId=${classGroupId}` : ""}`,
      `attendance-${date}.csv`,
    ).catch((err: Error) => setError(err.message));

  const exportMonthly = () => {
    const fromDate = `${year}-${month}-01`;
    const toDate = new Date(Number(year), Number(month), 0)
      .toISOString()
      .slice(0, 10);
    return downloadCsv(
      `/attendance/export?from=${fromDate}&to=${toDate}${classGroupId ? `&classGroupId=${classGroupId}` : ""}`,
      `attendance-${fromDate}-to-${toDate}.csv`,
    ).catch((err: Error) => setError(err.message));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Attendance Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Daily and monthly reports, late arrivals and CSV export
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["daily", "monthly", "late"] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t === "daily"
              ? "Daily report"
              : t === "monthly"
                ? "Monthly report"
                : "Late arrivals"}
          </Button>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {tab === "daily" && (
        <>
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto_auto]">
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
              <div className="flex items-end">
                <Button variant="secondary" onClick={() => void loadDaily()}>
                  Apply
                </Button>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={exportDaily}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {dailyLoading ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Spinner className="mx-auto text-muted-foreground" />
              </CardContent>
            </Card>
          ) : daily ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
                {[
                  { label: "Enrolled", value: daily.totals.enrolled },
                  { label: "Present", value: daily.totals.present },
                  { label: "Absent", value: daily.totals.absent },
                  { label: "Late", value: daily.totals.late },
                  { label: "Excused", value: daily.totals.excused },
                  { label: "Marked", value: daily.totals.total },
                  { label: "Rate", value: `${daily.totals.presentRate}%` },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border p-3 text-center"
                  >
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By class</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Enrolled</TableHead>
                        <TableHead className="text-right">Present</TableHead>
                        <TableHead className="text-right">Absent</TableHead>
                        <TableHead className="text-right">Late</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {daily.rows.map((row) => (
                        <TableRow key={row.classGroupId}>
                          <TableCell className="font-medium">
                            {row.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.enrolled}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.present}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.absent}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.late}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-semibold",
                              rateClass(row.presentRate),
                            )}
                          >
                            {row.presentRate}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Absent / late students ({daily.absentLate.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {daily.absentLate.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Everyone was present
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Admission No.</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Guardian</TableHead>
                          <TableHead>Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {daily.absentLate.map((r) => (
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
                            <TableCell>
                              {r.student.guardianName ?? "-"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {r.student.guardianPhone ??
                                r.student.guardianEmail ??
                                "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}

      {tab === "monthly" && (
        <>
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <div className="space-y-1">
                <label className="text-sm font-medium">Month</label>
                <select
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    setMonthPage(1);
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={String(m)}>
                      {new Date(0, m - 1).toLocaleString("en", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setMonthPage(1);
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Class (optional)</label>
                <select
                  value={classGroupId}
                  onChange={(e) => {
                    setClassGroupId(e.target.value);
                    setMonthPage(1);
                  }}
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
              <div className="flex items-end">
                <Button variant="secondary" onClick={() => setMonthPage(1)}>
                  Apply
                </Button>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={exportMonthly}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {monthlyLoading ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Spinner className="mx-auto text-muted-foreground" />
              </CardContent>
            </Card>
          ) : monthly ? (
            <>
              {monthlyMeta?.totals && (
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    { label: "Students", value: monthlyMeta.totalItems },
                    { label: "Present", value: monthlyMeta.totals.present },
                    { label: "Absent", value: monthlyMeta.totals.absent },
                    { label: "Late", value: monthlyMeta.totals.late },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border p-3 text-center"
                    >
                      <p className="text-xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Per student · overall rate{" "}
                    {monthlyMeta?.totals
                      ? `${monthlyMeta.totals.presentRate}%`
                      : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admission No.</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Present</TableHead>
                        <TableHead className="text-right">Absent</TableHead>
                        <TableHead className="text-right">Late</TableHead>
                        <TableHead className="text-right">Days</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthly.map((row) => (
                        <TableRow key={row.studentId}>
                          <TableCell className="font-mono text-xs">
                            {row.admissionNumber}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.name}
                          </TableCell>
                          <TableCell>{row.className || "-"}</TableCell>
                          <TableCell className="text-right">
                            {row.PRESENT ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.ABSENT ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.LATE ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.totalDays}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-semibold",
                              rateClass(row.presentRate),
                            )}
                          >
                            {row.presentRate}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {monthlyMeta && monthlyMeta.totalItems > 25 && (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {monthPage} · {monthlyMeta.totalItems} students
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={monthPage <= 1}
                          onClick={() => setMonthPage((p) => p - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={monthPage * 25 >= monthlyMeta.totalItems}
                          onClick={() => setMonthPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}

      {tab === "late" && (
        <>
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <div className="space-y-1">
                <label className="text-sm font-medium">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
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
              <div className="flex items-end">
                <Button variant="secondary" onClick={() => void loadLate()}>
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Late arrivals</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {lateLoading ? (
                <div className="py-10 text-center">
                  <Spinner className="mx-auto text-muted-foreground" />
                </div>
              ) : late && late.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {late.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.date.slice(0, 10)}</TableCell>
                        <TableCell className="font-medium">
                          {item.studentName}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.admissionNumber}
                        </TableCell>
                        <TableCell>{item.className || "-"}</TableCell>
                        <TableCell>{item.remark ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No late arrivals in this range
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
