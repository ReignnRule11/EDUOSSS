"use client";

import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface Overview {
  students: number;
  activeStudents: number;
  teachers: number;
  classes: number;
  subjects: number;
  sessions: number;
  departments: number;
  announcements: number;
  enrollments: number;
}

interface EnrollmentItem {
  classGroupId: string;
  name: string;
  gradeLevel: string;
  count: number;
}

interface EnrollmentByClass {
  total: number;
  items: EnrollmentItem[];
}

interface GenderItem {
  gender: string;
  count: number;
}

interface AttendanceSummary {
  total: number;
  presentCount: number;
  presentRate: number;
  byStatus: { status: string; count: number }[];
}

interface SessionRow {
  name: string;
  status: string;
  isCurrent: boolean;
  terms: number;
}

interface TermRow {
  name: string;
  status: string;
  isCurrent: boolean;
  sessionId: string;
}

interface AcademicYear {
  sessions: SessionRow[];
  terms: TermRow[];
}

export default function ReportsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentByClass | null>(null);
  const [gender, setGender] = useState<GenderItem[] | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      api
        .get<Overview>("/reports/overview")
        .then(({ data }) => setOverview(data)),
      api
        .get<EnrollmentByClass>("/reports/enrollment-by-class")
        .then(({ data }) => setEnrollment(data)),
      api
        .get<GenderItem[]>("/reports/gender-distribution")
        .then(({ data }) => setGender(data)),
      api
        .get<AttendanceSummary>("/reports/attendance-summary")
        .then(({ data }) => setAttendance(data)),
      api
        .get<AcademicYear>("/reports/academic-year")
        .then(({ data }) => setAcademicYear(data)),
    ])
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Failed to load reports",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Summary statistics across the school
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Students", value: overview.students },
            { label: "Teachers", value: overview.teachers },
            { label: "Classes", value: overview.classes },
            { label: "Subjects", value: overview.subjects },
            { label: "Enrollments", value: overview.enrollments },
            { label: "Departments", value: overview.departments },
            { label: "Sessions", value: overview.sessions },
            { label: "Announcements", value: overview.announcements },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {enrollment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enrollment by class</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {enrollment.items.length === 0 ? (
                <p className="text-muted-foreground">No enrollment data</p>
              ) : (
                <>
                  {enrollment.items.map((item) => (
                    <div key={item.classGroupId}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {item.name}{" "}
                          <span className="text-muted-foreground">
                            ({item.gradeLevel})
                          </span>
                        </span>
                        <span>{item.count} students</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${enrollment.total > 0 ? (item.count / enrollment.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-muted-foreground">
                    Total: {enrollment.total} enrollments
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {gender && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gender distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {gender.length === 0 ? (
                <p className="text-muted-foreground">No student gender data</p>
              ) : (
                <>
                  {gender.map((item) => (
                    <div key={item.gender}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">
                          {item.gender.toLowerCase()}
                        </span>
                        <span>{item.count} students</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${
                              (item.count /
                                Math.max(
                                  1,
                                  gender.reduce((s, g) => s + g.count, 0),
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {attendance && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{attendance.total} records</Badge>
                <Badge variant="outline">
                  {attendance.presentCount} present
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Present rate:{" "}
                <span className="font-medium text-foreground">
                  {(attendance.presentRate * 100).toFixed(1)}%
                </span>
              </p>
              {attendance.byStatus.length > 0 && (
                <div className="space-y-1">
                  {attendance.byStatus.map((item) => (
                    <div key={item.status} className="flex justify-between">
                      <span className="capitalize">
                        {item.status.toLowerCase()}
                      </span>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {academicYear && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Academic year</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {academicYear.sessions.length === 0 ? (
                <p className="text-muted-foreground">No sessions</p>
              ) : (
                academicYear.sessions.map((session) => (
                  <div key={session.name}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{session.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={session.isCurrent ? "default" : "secondary"}
                        >
                          {session.status}
                        </Badge>
                        {session.isCurrent && (
                          <Badge variant="outline">Current</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.terms} {session.terms === 1 ? "term" : "terms"}
                    </p>
                  </div>
                ))
              )}
              {academicYear.terms.length > 0 && (
                <div className="border-t pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Terms
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {academicYear.terms.map((term) => (
                      <Badge
                        key={`${term.sessionId}-${term.name}`}
                        variant={term.isCurrent ? "default" : "secondary"}
                      >
                        {term.name}
                        {term.isCurrent ? " (current)" : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
