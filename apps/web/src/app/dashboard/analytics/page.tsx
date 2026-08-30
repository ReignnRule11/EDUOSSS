"use client";

import {
  Activity,
  Award,
  BookOpen,
  DollarSign,
  Download,
  GraduationCap,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadCsv } from "@/lib/download";

interface SeriesItem {
  label: string;
  value: number;
}

interface Overview {
  widgets: {
    totalStudents: number;
    activeEnrollments: number;
    revenueCollected: number;
    outstandingFees: number;
    attendanceRate: number;
    academicAverage: number;
    teacherCount: number;
    paymentCollectionRate: number;
  };
  studentGrowth: SeriesItem[];
  revenueByMonth: SeriesItem[];
}

interface Admissions {
  byMonth: SeriesItem[];
  byStatus: Record<string, number>;
}

interface Enrollment {
  byClass: SeriesItem[];
  byYear: SeriesItem[];
}

interface Attendance {
  dailyTrend: Array<{ date: string; present: number; rate: number }>;
  overall: { rate: number; present: number; total: number };
}

interface Academic {
  overallAverage: number;
  byTerm: Array<{ label: string; average: number }>;
  gradeDistribution: Record<string, number>;
}

interface TeacherProductivity {
  total: number;
  avgClasses: number;
  avgStudents: number;
}

interface PaymentCollection {
  invoiced: number;
  collected: number;
  collectionRate: number;
  series: Array<{ label: string; invoiced: number; collected: number }>;
}

const LazyBarChart = dynamic(
  () => import("@/components/charts/bar-chart").then((m) => m.BarChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-24 items-center justify-center">
        <Spinner />
      </div>
    ),
  },
);

function BarChart({
  data,
  valueKey,
}: {
  data: SeriesItem[];
  valueKey?: string;
}) {
  if (data.length === 0)
    return <p className="text-sm text-muted-foreground">No data.</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-1">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-20 shrink-0 truncate text-muted-foreground">
            {d.label}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted/40">
            <div
              className="h-full rounded bg-primary/70"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-medium">
            {d.value.toLocaleString()}
          </span>
        </div>
      ))}
      {valueKey && <p className="text-xs text-muted-foreground">{valueKey}</p>}
    </div>
  );
}

export default function EnterpriseDashboardsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role !== "STUDENT" && user?.role !== "PARENT";

  const [overview, setOverview] = useState<Overview | null>(null);
  const [admissions, setAdmissions] = useState<Admissions | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [academic, setAcademic] = useState<Academic | null>(null);
  const [teachers, setTeachers] = useState<TeacherProductivity | null>(null);
  const [collection, setCollection] = useState<PaymentCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, a, e, at, ac, t, c] = await Promise.all([
        api.get<Overview>("/enterprise-dashboards/overview"),
        api.get<Admissions>("/enterprise-dashboards/admissions"),
        api.get<Enrollment>("/enterprise-dashboards/enrollment"),
        api.get<Attendance>("/enterprise-dashboards/attendance?windowDays=30"),
        api.get<Academic>("/enterprise-dashboards/academic-performance"),
        api.get<TeacherProductivity>(
          "/enterprise-dashboards/teacher-productivity",
        ),
        api.get<PaymentCollection>("/enterprise-dashboards/payment-collection"),
      ]);
      setOverview(o.data);
      setAdmissions(a.data);
      setEnrollment(e.data);
      setAttendance(at.data);
      setAcademic(ac.data);
      setTeachers(t.data);
      setCollection(c.data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load dashboards",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        You do not have permission to view enterprise dashboards.
      </div>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 1 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Enterprise Dashboards
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time metrics across admissions, finance, academics and staff
          </p>
        </div>
        <button
          onClick={() =>
            void downloadCsv(
              "/enterprise-dashboards/export",
              "enterprise-dashboard.csv",
            )
          }
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
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
      ) : overview ? (
        <>
          {/* KPI widgets */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.widgets.totalStudents}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview.widgets.activeEnrollments} active enrollments
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmt(overview.widgets.revenueCollected)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {fmt(overview.widgets.outstandingFees)} outstanding
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Attendance
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.widgets.attendanceRate}%
                </div>
                <p className="text-xs text-muted-foreground">present rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Academic average
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.widgets.academicAverage}
                </div>
                <p className="text-xs text-muted-foreground">
                  approved term results
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Teachers</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.widgets.teacherCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {teachers
                    ? `${teachers.avgClasses} avg classes · ${teachers.avgStudents} avg students`
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Payment collection
                </CardTitle>
                <Wallet className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.widgets.paymentCollectionRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {collection
                    ? `${fmt(collection.collected)} of ${fmt(collection.invoiced)}`
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Student growth
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.studentGrowth.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  months of growth
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Admissions
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview.widgets.totalStudents}
                </div>
                <p className="text-xs text-muted-foreground">
                  {admissions
                    ? Object.values(admissions.byStatus).reduce(
                        (s, v) => s + v,
                        0,
                      )
                    : 0}{" "}
                  total admitted
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Student growth (cumulative)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LazyBarChart data={overview.studentGrowth} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by month</CardTitle>
              </CardHeader>
              <CardContent>
                <LazyBarChart
                  data={overview.revenueByMonth}
                  valueKey="collected"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admissions by month</CardTitle>
              </CardHeader>
              <CardContent>
                {admissions ? <LazyBarChart data={admissions.byMonth} /> : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enrollment by class</CardTitle>
              </CardHeader>
              <CardContent>
                {enrollment ? <LazyBarChart data={enrollment.byClass} /> : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Academic average by term
                </CardTitle>
              </CardHeader>
              <CardContent>
                {academic ? (
                  <BarChart
                    data={academic.byTerm.map((t) => ({
                      label: t.label,
                      value: t.average,
                    }))}
                  />
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Collection vs invoiced
                </CardTitle>
              </CardHeader>
              <CardContent>
                {collection ? (
                  <div className="space-y-1">
                    {collection.series.map((s) => (
                      <div
                        key={s.label}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="w-16 shrink-0 text-muted-foreground">
                          {s.label}
                        </span>
                        <div className="h-4 flex-1 space-x-0.5 overflow-hidden">
                          <div
                            className="inline-block h-full rounded bg-muted-foreground/40"
                            style={{
                              width: `${s.invoiced > 0 ? 60 : 0}%`,
                            }}
                          />
                        </div>
                        <div className="h-4 flex-1 overflow-hidden">
                          <div
                            className="h-full rounded bg-emerald-500/70"
                            style={{
                              width: `${
                                s.invoiced > 0
                                  ? (s.collected / s.invoiced) * 60
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right text-muted-foreground">
                          {Math.round(
                            s.invoiced ? (s.collected / s.invoiced) * 100 : 0,
                          )}
                          %
                        </span>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      grey = invoiced, green = collected
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Attendance trend (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendance ? (
                  <BarChart
                    data={attendance.dailyTrend.map((d) => ({
                      label: d.date.slice(5),
                      value: d.rate,
                    }))}
                  />
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grade distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {academic ? (
                  <BarChart
                    data={Object.entries(academic.gradeDistribution).map(
                      ([label, value]) => ({ label, value }),
                    )}
                  />
                ) : null}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
