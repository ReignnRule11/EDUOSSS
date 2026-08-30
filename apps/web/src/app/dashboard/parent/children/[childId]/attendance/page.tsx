"use client";

import { ArrowLeft, Activity } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remark: string | null;
}

interface AttendanceData {
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    presentRate: number;
  };
  records: AttendanceRecord[];
}

const STATUS_STYLE: Record<string, string> = {
  PRESENT: "bg-emerald-500/15 text-emerald-600",
  ABSENT: "bg-red-500/15 text-red-600",
  LATE: "bg-amber-500/15 text-amber-600",
  EXCUSED: "bg-blue-500/15 text-blue-600",
};

export default function ChildAttendancePage() {
  const { childId } = useParams<{ childId: string }>();
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<AttendanceData>(
        `/parent/children/${childId}/attendance`,
      );
      setData(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load attendance",
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
        <Activity className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
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
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Present</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {data.summary.present}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Absent / Late
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {data.summary.absent} / {data.summary.late}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Present rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.summary.presentRate}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Recent records ({data.records.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.records.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No attendance records yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.records.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-md border p-3 text-sm"
                    >
                      <span className="font-medium">
                        {new Date(r.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        {r.remark && (
                          <span className="text-xs text-muted-foreground">
                            {r.remark}
                          </span>
                        )}
                        <Badge
                          variant="secondary"
                          className={STATUS_STYLE[r.status]}
                        >
                          {r.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
