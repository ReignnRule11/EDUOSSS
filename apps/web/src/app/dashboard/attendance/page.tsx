"use client";

import {
  Activity,
  AlertTriangle,
  BellRing,
  CalendarCheck2,
  FileSpreadsheet,
  QrCode,
  UserCheck,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface TrendPoint {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  presentRate: number;
}

interface ByClass {
  classGroupId: string;
  name: string;
  presentRate: number;
  PRESENT?: number;
  ABSENT?: number;
  LATE?: number;
  EXCUSED?: number;
}

interface RecentAlert {
  id: string;
  date: string;
  status: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
}

interface DashboardData {
  today: {
    date: string;
    total: number;
    PRESENT?: number;
    ABSENT?: number;
    LATE?: number;
    EXCUSED?: number;
    presentRate: number;
  };
  trend: TrendPoint[];
  byClass: ByClass[];
  recentAlerts: RecentAlert[];
  teachers: {
    date: string;
    totalActive: number;
    total: number;
    PRESENT?: number;
    ABSENT?: number;
    LATE?: number;
    EXCUSED?: number;
    presentRate: number;
  };
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    PRESENT: "bg-emerald-500/15 text-emerald-600",
    ABSENT: "bg-red-500/15 text-red-600",
    LATE: "bg-amber-500/15 text-amber-600",
    EXCUSED: "bg-blue-500/15 text-blue-600",
  };
  return (
    <Badge className={styles[status] ?? ""} variant="secondary">
      {status}
    </Badge>
  );
}

export default function AttendanceDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: d } = await api.get<DashboardData>("/attendance/dashboard");
      setData(d);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Attendance Dashboard
        </h1>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  const { today, teachers } = data;
  const maxTrend = Math.max(...data.trend.map((t) => t.presentRate), 1);

  const statCards = [
    {
      label: "Present today",
      value: today.PRESENT ?? 0,
      sub: `${today.presentRate}% rate`,
      icon: UserCheck,
      tone: "text-emerald-600",
    },
    {
      label: "Absent today",
      value: today.ABSENT ?? 0,
      sub: "students",
      icon: UserX,
      tone: "text-red-600",
    },
    {
      label: "Late today",
      value: today.LATE ?? 0,
      sub: "arrivals",
      icon: CalendarCheck2,
      tone: "text-amber-600",
    },
    {
      label: "Teachers present",
      value: teachers.PRESENT ?? 0,
      sub: `${teachers.totalActive} active staff`,
      icon: Activity,
      tone: "text-blue-600",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Attendance Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Daily attendance, trends and alerts across students and staff
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/attendance/students"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <CalendarCheck2 className="h-4 w-4" /> Take attendance
          </Link>
          <Link
            href="/dashboard/attendance/qr"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <QrCode className="h-4 w-4" /> QR sheet
          </Link>
          <Link
            href="/dashboard/attendance/reports"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <FileSpreadsheet className="h-4 w-4" /> Reports
          </Link>
          <Link
            href="/dashboard/attendance/alerts"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <BellRing className="h-4 w-4" /> Alerts
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg bg-muted",
                  card.tone,
                )}
              >
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-muted-foreground">
                  {card.label} · {card.sub}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Present rate · last 30 days
            </CardTitle>
            <CardDescription>
              Daily student attendance percentage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-1">
              {data.trend.map((point) => (
                <div
                  key={point.date}
                  className="group relative flex-1"
                  title={`${point.date}: ${point.presentRate}% (${point.present}/${point.total})`}
                >
                  <div
                    className={cn(
                      "w-full rounded-t transition-colors",
                      point.presentRate >= 90
                        ? "bg-emerald-500/70"
                        : point.presentRate >= 75
                          ? "bg-amber-500/70"
                          : "bg-red-500/70",
                    )}
                    style={{
                      height: `${Math.max((point.presentRate / maxTrend) * 100, 3)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{data.trend[0]?.date ?? ""}</span>
              <span>{data.trend[data.trend.length - 1]?.date ?? ""}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Recent absent / late
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentAlerts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No recent absent or late arrivals
              </p>
            ) : (
              data.recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {alert.studentName}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {alert.admissionNumber}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {alert.className} · {alert.date.slice(0, 10)}
                    </p>
                  </div>
                  {statusBadge(alert.status)}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Attendance by class · last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Present</TableHead>
                <TableHead className="text-right">Absent</TableHead>
                <TableHead className="text-right">Late</TableHead>
                <TableHead className="text-right">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byClass.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No attendance recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                data.byClass.map((row) => (
                  <TableRow key={row.classGroupId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
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
                      <span
                        className={cn(
                          "font-semibold",
                          row.presentRate >= 90
                            ? "text-emerald-600"
                            : row.presentRate >= 75
                              ? "text-amber-600"
                              : "text-red-600",
                        )}
                      >
                        {row.presentRate}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff presence · today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Active staff", value: teachers.totalActive },
              { label: "Marked", value: teachers.total },
              { label: "Present", value: teachers.PRESENT ?? 0 },
              { label: "Absent", value: teachers.ABSENT ?? 0 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border p-4 text-center"
              >
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
