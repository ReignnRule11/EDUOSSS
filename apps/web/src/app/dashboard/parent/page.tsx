"use client";

import {
  Activity,
  Award,
  BookOpen,
  FileSpreadsheet,
  GraduationCap,
  ScrollText,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  photoUrl: string | null;
  className: string | null;
  classGroupId: string | null;
}

interface Dashboard {
  attendanceRecords: number;
  latestResults: Array<{
    id: string;
    academicYear: string;
    term: string;
    average: number | null;
  }>;
  outstandingFees: number;
  pendingAssignments: number;
}

export default function ParentPortalPage() {
  const { user } = useAuth();
  const isParent = user?.role === "PARENT";

  const [children, setChildren] = useState<Child[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDash, setLoadingDash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Child[]>("/parent/children");
      setChildren(data);
      if (data.length > 0) setSelected(data[0]!.id);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load children",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isParent) void loadChildren();
  }, [isParent, loadChildren]);

  useEffect(() => {
    if (!selected) return;
    setLoadingDash(true);
    setError(null);
    api
      .get<Dashboard>(`/parent/children/${selected}/dashboard`)
      .then(({ data }) => setDashboard(data))
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load dashboard",
        ),
      )
      .finally(() => setLoadingDash(false));
  }, [selected]);

  if (!isParent) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        This portal is for parents. Sign in with a parent account.
      </div>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Parent Portal</h1>
        <p className="text-sm text-muted-foreground">
          Track your children&apos;s academics, attendance and fees
        </p>
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
      ) : children.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No children are linked to your account yet. Contact the school to link
          your child.
        </p>
      ) : (
        <>
          {/* Child selector */}
          <div className="flex flex-wrap gap-2">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelected(child.id)}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  selected === child.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-background hover:bg-accent"
                }`}
              >
                {child.firstName} {child.lastName}
              </button>
            ))}
          </div>

          {dashboard && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Attendance
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboard.attendanceRecords}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      records logged
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Outstanding fees
                    </CardTitle>
                    <Wallet className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {fmt(dashboard.outstandingFees)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      unpaid balance
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pending assignments
                    </CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboard.pendingAssignments}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      not submitted
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Latest results
                    </CardTitle>
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboard.latestResults.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      approved / released terms
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick links */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  href={`/dashboard/parent/children/${selected}/attendance`}
                  className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-5 w-5 text-primary" /> Attendance
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Daily attendance records
                  </p>
                </Link>
                <Link
                  href={`/dashboard/parent/children/${selected}/results`}
                  className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Award className="h-5 w-5 text-primary" /> Results
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Report cards and grades
                  </p>
                </Link>
                <Link
                  href={`/dashboard/parent/children/${selected}/assignments`}
                  className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <BookOpen className="h-5 w-5 text-primary" /> Assignments
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Homework and due dates
                  </p>
                </Link>
                <Link
                  href={`/dashboard/parent/children/${selected}/payments`}
                  className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Wallet className="h-5 w-5 text-primary" /> Payments
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Invoices, receipts and balances
                  </p>
                </Link>
                <Link
                  href={`/dashboard/parent/children/${selected}/notifications`}
                  className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ScrollText className="h-5 w-5 text-primary" />{" "}
                    Notifications
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    School-to-parent alerts
                  </p>
                </Link>
                <Link
                  href="/dashboard/parent/messages"
                  className="rounded-lg border bg-background p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />{" "}
                    Messages
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Contact your child&apos;s teachers
                  </p>
                </Link>
              </div>

              {dashboard.latestResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Latest results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dashboard.latestResults.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-md border p-3 text-sm"
                      >
                        <span className="font-medium">
                          {r.academicYear} · {r.term}
                        </span>
                        <Badge variant="secondary">
                          Average: {r.average ?? "—"}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
          {loadingDash && (
            <div className="flex h-24 items-center justify-center">
              <Spinner />
            </div>
          )}
        </>
      )}
    </div>
  );
}
