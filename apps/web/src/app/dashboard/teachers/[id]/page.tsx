"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Camera,
  CalendarCheck,
  FileText,
  Plane,
  Star,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Qualification {
  id: string;
  level: string;
  degree: string;
  institution: string;
  fieldOfStudy: string | null;
  yearAchieved: number | null;
  grade: string | null;
  notes: string | null;
}

interface EmploymentHistory {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  remark: string | null;
}

interface PerformanceReview {
  id: string;
  academicYear: string | null;
  reviewDate: string;
  rating: string;
  strengths: string | null;
  improvements: string | null;
  comments: string | null;
}

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number | null;
  reason: string | null;
  status: string;
  remarks: string | null;
}

interface SalaryRecord {
  id: string;
  effectiveDate: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  currency: string;
  isActive: boolean;
  notes: string | null;
}

interface TeacherDocument {
  id: string;
  name: string;
  category: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  notes: string | null;
}

interface TeacherProfile {
  id: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  phone: string | null;
  email: string | null;
  specialization: string | null;
  employmentType: string;
  joinedAt: string | null;
  photoUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  isActive: boolean;
  school?: { id: string; name: string; code: string } | null;
  department?: { id: string; name: string } | null;
  user?: { id: string; email: string; role: string } | null;
  classGroups?: Array<{ id: string; name: string; academicYear: string }>;
  qualifications?: Qualification[];
  employmentHistory?: EmploymentHistory[];
  attendance?: AttendanceRecord[];
  performanceReviews?: PerformanceReview[];
  leaveRequests?: LeaveRequest[];
  salaryRecords?: SalaryRecord[];
  documents?: TeacherDocument[];
  stats?: {
    attendanceRecords: number;
    reviewCount: number;
    leaveCount: number;
    documentCount: number;
    pendingLeave: number;
    latestAttendance: AttendanceRecord | null;
  };
}

const TABS = [
  "Overview",
  "Qualifications",
  "Employment",
  "Attendance",
  "Reviews",
  "Leave",
  "Salary",
  "Documents",
] as const;

type Tab = (typeof TABS)[number];

export default function TeacherProfilePage() {
  const params = useParams<{ id: string }>();
  const teacherId = params.id;

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<TeacherProfile>(
        `/teachers/${teacherId}/profile`,
      );
      setTeacher(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load teacher profile",
      );
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("photo", file);
      const token =
        typeof window !== "undefined"
          ? (JSON.parse(localStorage.getItem("eduos.tokens") ?? "{}")
              .accessToken as string)
          : "";
      const tenant = JSON.parse(
        localStorage.getItem("eduos.activeTenant") ?? "{}",
      ) as { slug?: string };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"}/teachers/${teacherId}/photo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Tenant-Id": tenant.slug ?? "",
          },
          body,
        },
      );
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      };
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message ?? "Photo upload failed");
      }
      setMessage("Profile photo updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (error && !teacher) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/teachers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to teachers
        </Link>
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      </div>
    );
  }

  if (!teacher) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/teachers"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {teacher.firstName} {teacher.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {teacher.staffNumber} · {teacher.school?.name ?? "—"}
            </p>
          </div>
        </div>
        <Badge variant={teacher.isActive ? "default" : "secondary"}>
          {teacher.isActive ? "ACTIVE" : "INACTIVE"}
        </Badge>
      </div>

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

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column: photo + identity */}
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border bg-muted">
                {teacher.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={teacher.photoUrl}
                    alt={`${teacher.firstName} ${teacher.lastName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <label
                htmlFor="teacher-photo"
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent",
                  saving && "pointer-events-none opacity-50",
                )}
              >
                <Camera className="h-4 w-4" />
                Upload photo
              </label>
              <input
                id="teacher-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhoto}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Staff details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Gender" value={teacher.gender ?? "—"} />
              <Row label="Employment" value={teacher.employmentType} />
              <Row label="Department" value={teacher.department?.name ?? "—"} />
              <Row
                label="Specialization"
                value={teacher.specialization ?? "—"}
              />
              <Row
                label="Joined"
                value={
                  teacher.joinedAt
                    ? new Date(teacher.joinedAt).toLocaleDateString()
                    : "—"
                }
              />
              <Row label="Phone" value={teacher.phone ?? "—"} />
              <Row label="Email" value={teacher.email ?? "—"} />
              <Row
                label="Emergency contact"
                value={
                  teacher.emergencyContactName
                    ? `${teacher.emergencyContactName}${
                        teacher.emergencyContactPhone
                          ? ` · ${teacher.emergencyContactPhone}`
                          : ""
                      }`
                    : "—"
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Classes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {teacher.classGroups && teacher.classGroups.length > 0 ? (
                teacher.classGroups.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.academicYear}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No class assignments</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: tabs */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Overview" && <OverviewTab teacher={teacher} />}
          {tab === "Qualifications" && (
            <QualificationsTab
              items={teacher.qualifications}
              teacherId={teacherId}
              onChanged={load}
            />
          )}
          {tab === "Employment" && (
            <EmploymentTab
              items={teacher.employmentHistory}
              teacherId={teacherId}
              onChanged={load}
            />
          )}
          {tab === "Attendance" && (
            <AttendanceTab
              items={teacher.attendance}
              teacherId={teacherId}
              onChanged={load}
            />
          )}
          {tab === "Reviews" && (
            <ReviewsTab
              items={teacher.performanceReviews}
              teacherId={teacherId}
              onChanged={load}
            />
          )}
          {tab === "Leave" && (
            <LeaveTab
              items={teacher.leaveRequests}
              teacherId={teacherId}
              onChanged={load}
            />
          )}
          {tab === "Salary" && (
            <SalaryTab
              items={teacher.salaryRecords}
              teacherId={teacherId}
              onChanged={load}
            />
          )}
          {tab === "Documents" && (
            <DocumentsTab
              items={teacher.documents}
              teacherId={teacherId}
              onChanged={load}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

/* ---------- Overview ---------- */

function OverviewTab({ teacher }: { teacher: TeacherProfile }) {
  const stats = teacher.stats;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Attendance" value={stats?.attendanceRecords ?? 0} />
        <StatCard label="Reviews" value={stats?.reviewCount ?? 0} />
        <StatCard
          label="Pending leave"
          value={stats?.pendingLeave ?? 0}
          highlight={(stats?.pendingLeave ?? 0) > 0}
        />
        <StatCard label="Documents" value={stats?.documentCount ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarCheck className="h-4 w-4" />
            Latest attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {stats?.latestAttendance ? (
            <div className="flex items-center justify-between">
              <span>
                {new Date(stats.latestAttendance.date).toLocaleDateString()}
              </span>
              <Badge variant="outline">{stats.latestAttendance.status}</Badge>
            </div>
          ) : (
            <p className="text-muted-foreground">No attendance recorded yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Plane className="h-4 w-4" />
            Recent leave
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {teacher.leaveRequests && teacher.leaveRequests.length > 0 ? (
            teacher.leaveRequests.slice(0, 3).map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="font-medium">
                  {l.leaveType} · {l.days ?? "-"} day(s)
                </span>
                <Badge
                  variant={
                    l.status === "APPROVED"
                      ? "default"
                      : l.status === "PENDING"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {l.status}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No leave requests</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Star className="h-4 w-4" />
            Recent reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {teacher.performanceReviews &&
          teacher.performanceReviews.length > 0 ? (
            teacher.performanceReviews.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="font-medium">
                  {r.academicYear ??
                    new Date(r.reviewDate).toLocaleDateString()}
                </span>
                <Badge variant="outline">{r.rating}</Badge>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No reviews recorded</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-amber-300 bg-amber-50")}>
      <CardContent className="pt-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

/* ---------- Qualifications ---------- */

function QualificationsTab({
  items,
  teacherId,
  onChanged,
}: {
  items: TeacherProfile["qualifications"];
  teacherId: string;
  onChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    level: "BACHELOR",
    degree: "",
    institution: "",
    fieldOfStudy: "",
    yearAchieved: "",
    grade: "",
    notes: "",
  });

  const levels = [
    "CERTIFICATE",
    "DIPLOMA",
    "ASSOCIATE",
    "BACHELOR",
    "MASTER",
    "DOCTORATE",
    "OTHER",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/teacher-qualifications", {
        teacherId,
        ...form,
        fieldOfStudy: form.fieldOfStudy || undefined,
        grade: form.grade || undefined,
        notes: form.notes || undefined,
        yearAchieved: form.yearAchieved ? Number(form.yearAchieved) : undefined,
      });
      setShowForm(false);
      setForm({
        level: "BACHELOR",
        degree: "",
        institution: "",
        fieldOfStudy: "",
        yearAchieved: "",
        grade: "",
        notes: "",
      });
      setMessage("Qualification added.");
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
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

      <Button size="sm" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Add qualification"}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="q-level">Level</Label>
                  <select
                    id="q-level"
                    value={form.level}
                    onChange={(e) =>
                      setForm({ ...form, level: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {levels.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="q-degree">Degree</Label>
                  <Input
                    id="q-degree"
                    required
                    placeholder="B.Sc. Education"
                    value={form.degree}
                    onChange={(e) =>
                      setForm({ ...form, degree: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="q-institution">Institution</Label>
                  <Input
                    id="q-institution"
                    required
                    value={form.institution}
                    onChange={(e) =>
                      setForm({ ...form, institution: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="q-field">Field of study</Label>
                  <Input
                    id="q-field"
                    value={form.fieldOfStudy}
                    onChange={(e) =>
                      setForm({ ...form, fieldOfStudy: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="q-year">Year achieved</Label>
                  <Input
                    id="q-year"
                    type="number"
                    min={1950}
                    max={2100}
                    value={form.yearAchieved}
                    onChange={(e) =>
                      setForm({ ...form, yearAchieved: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="q-grade">Grade</Label>
                  <Input
                    id="q-grade"
                    value={form.grade}
                    onChange={(e) =>
                      setForm({ ...form, grade: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add qualification"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((q) => (
            <Card key={q.id}>
              <CardContent className="flex items-start justify-between gap-2 pt-4 text-sm">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{q.degree}</p>
                    <p className="text-muted-foreground">
                      {q.institution}
                      {q.fieldOfStudy ? ` · ${q.fieldOfStudy}` : ""}
                    </p>
                    {q.grade && (
                      <p className="text-xs text-muted-foreground">{q.grade}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">{q.level}</Badge>
                  {q.yearAchieved && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {q.yearAchieved}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No qualifications recorded
        </p>
      )}
    </div>
  );
}

/* ---------- Employment ---------- */

function EmploymentTab({
  items,
  teacherId,
  onChanged,
}: {
  items: TeacherProfile["employmentHistory"];
  teacherId: string;
  onChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    organization: "",
    role: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/teacher-employment-history", {
        teacherId,
        organization: form.organization,
        role: form.role,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        isCurrent: form.isCurrent,
        description: form.description || undefined,
      });
      setShowForm(false);
      setForm({
        organization: "",
        role: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        description: "",
      });
      setMessage("Employment record added.");
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
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

      <Button size="sm" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Add employment"}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="e-org">Organization</Label>
                  <Input
                    id="e-org"
                    required
                    value={form.organization}
                    onChange={(e) =>
                      setForm({ ...form, organization: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="e-role">Role</Label>
                  <Input
                    id="e-role"
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="e-start">Start date</Label>
                  <Input
                    id="e-start"
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="e-end">End date</Label>
                  <Input
                    id="e-end"
                    type="date"
                    value={form.endDate}
                    disabled={form.isCurrent}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isCurrent}
                    onChange={(e) =>
                      setForm({ ...form, isCurrent: e.target.checked })
                    }
                  />
                  Current position
                </label>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="e-desc">Description</Label>
                  <Input
                    id="e-desc"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add employment"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-start justify-between gap-2 pt-4 text-sm">
                <div className="flex items-start gap-3">
                  <Briefcase className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {e.role} · {e.organization}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.startDate).toLocaleDateString()} →{" "}
                      {e.isCurrent
                        ? "Present"
                        : e.endDate
                          ? new Date(e.endDate).toLocaleDateString()
                          : "—"}
                    </p>
                    {e.description && (
                      <p className="text-muted-foreground">{e.description}</p>
                    )}
                  </div>
                </div>
                {e.isCurrent && <Badge>Current</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No employment history
        </p>
      )}
    </div>
  );
}

/* ---------- Attendance ---------- */

function AttendanceTab({
  items,
  teacherId,
  onChanged,
}: {
  items: TeacherProfile["attendance"];
  teacherId: string;
  onChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: "",
    status: "PRESENT",
    checkInAt: "",
    checkOutAt: "",
    remark: "",
  });

  const statuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/teacher-attendance", {
        teacherId,
        date: form.date,
        status: form.status,
        checkInAt: form.checkInAt || undefined,
        checkOutAt: form.checkOutAt || undefined,
        remark: form.remark || undefined,
      });
      setShowForm(false);
      setForm({
        date: "",
        status: "PRESENT",
        checkInAt: "",
        checkOutAt: "",
        remark: "",
      });
      setMessage("Attendance recorded.");
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
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

      <Button size="sm" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Record attendance"}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="a-date">Date</Label>
                  <Input
                    id="a-date"
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="a-status">Status</Label>
                  <select
                    id="a-status"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="a-in">Check-in</Label>
                  <Input
                    id="a-in"
                    type="datetime-local"
                    value={form.checkInAt}
                    onChange={(e) =>
                      setForm({ ...form, checkInAt: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="a-out">Check-out</Label>
                  <Input
                    id="a-out"
                    type="datetime-local"
                    value={form.checkOutAt}
                    onChange={(e) =>
                      setForm({ ...form, checkOutAt: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="a-remark">Remark</Label>
                  <Input
                    id="a-remark"
                    value={form.remark}
                    onChange={(e) =>
                      setForm({ ...form, remark: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Record attendance"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {items && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between pt-4 text-sm">
                <span className="font-medium">
                  {new Date(a.date).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  {a.checkInAt && (
                    <span className="text-xs text-muted-foreground">
                      In {new Date(a.checkInAt).toLocaleTimeString()}
                    </span>
                  )}
                  <Badge variant="outline">{a.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No attendance records
        </p>
      )}
    </div>
  );
}

/* ---------- Reviews ---------- */

function ReviewsTab({
  items,
  teacherId,
  onChanged,
}: {
  items: TeacherProfile["performanceReviews"];
  teacherId: string;
  onChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    academicYear: "",
    reviewDate: "",
    rating: "GOOD",
    strengths: "",
    improvements: "",
    comments: "",
  });

  const ratings = [
    "EXCELLENT",
    "GOOD",
    "SATISFACTORY",
    "NEEDS_IMPROVEMENT",
    "POOR",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/teacher-performance-reviews", {
        teacherId,
        academicYear: form.academicYear || undefined,
        reviewDate: form.reviewDate,
        rating: form.rating,
        strengths: form.strengths || undefined,
        improvements: form.improvements || undefined,
        comments: form.comments || undefined,
      });
      setShowForm(false);
      setForm({
        academicYear: "",
        reviewDate: "",
        rating: "GOOD",
        strengths: "",
        improvements: "",
        comments: "",
      });
      setMessage("Review added.");
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
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

      <Button size="sm" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Add review"}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="r-year">Academic year</Label>
                  <Input
                    id="r-year"
                    placeholder="2025/2026"
                    value={form.academicYear}
                    onChange={(e) =>
                      setForm({ ...form, academicYear: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-date">Review date</Label>
                  <Input
                    id="r-date"
                    type="date"
                    required
                    value={form.reviewDate}
                    onChange={(e) =>
                      setForm({ ...form, reviewDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-rating">Rating</Label>
                  <select
                    id="r-rating"
                    value={form.rating}
                    onChange={(e) =>
                      setForm({ ...form, rating: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {ratings.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-strong">Strengths</Label>
                  <Input
                    id="r-strong"
                    value={form.strengths}
                    onChange={(e) =>
                      setForm({ ...form, strengths: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-imp">Improvements</Label>
                  <Input
                    id="r-imp"
                    value={form.improvements}
                    onChange={(e) =>
                      setForm({ ...form, improvements: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="r-comments">Comments</Label>
                  <Input
                    id="r-comments"
                    value={form.comments}
                    onChange={(e) =>
                      setForm({ ...form, comments: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add review"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-1 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {r.academicYear ??
                      new Date(r.reviewDate).toLocaleDateString()}
                  </p>
                  <Badge variant="outline">{r.rating}</Badge>
                </div>
                {r.strengths && (
                  <p className="text-xs">
                    <span className="font-medium text-muted-foreground">
                      Strengths:{" "}
                    </span>
                    {r.strengths}
                  </p>
                )}
                {r.improvements && (
                  <p className="text-xs text-muted-foreground">
                    {r.improvements}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No performance reviews
        </p>
      )}
    </div>
  );
}

/* ---------- Leave ---------- */

function LeaveTab({
  items,
  teacherId,
  onChanged,
}: {
  items: TeacherProfile["leaveRequests"];
  teacherId: string;
  onChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    leaveType: "ANNUAL",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const leaveTypes = [
    "ANNUAL",
    "SICK",
    "MATERNITY",
    "PATERNITY",
    "PERSONAL",
    "UNPAID",
    "OTHER",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/teacher-leave-requests", {
        teacherId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
      });
      setShowForm(false);
      setForm({ leaveType: "ANNUAL", startDate: "", endDate: "", reason: "" });
      setMessage("Leave request submitted.");
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(id: string, action: "approve" | "reject") {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.patch(`/teacher-leave-requests/${id}/${action}`, {
        remarks: action === "approve" ? "Approved by admin." : "Rejected.",
      });
      setMessage(`Leave request ${action}d.`);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Review failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
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

      <Button size="sm" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Request leave"}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="l-type">Leave type</Label>
                  <select
                    id="l-type"
                    value={form.leaveType}
                    onChange={(e) =>
                      setForm({ ...form, leaveType: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {leaveTypes.map((lt) => (
                      <option key={lt} value={lt}>
                        {lt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="l-start">Start date</Label>
                  <Input
                    id="l-start"
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="l-end">End date</Label>
                  <Input
                    id="l-end"
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="l-reason">Reason</Label>
                  <Input
                    id="l-reason"
                    value={form.reason}
                    onChange={(e) =>
                      setForm({ ...form, reason: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Submitting..." : "Request leave"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((l) => (
            <Card key={l.id}>
              <CardContent className="space-y-1 pt-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {l.leaveType} · {l.days ?? "-"} day(s)
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        l.status === "APPROVED"
                          ? "default"
                          : l.status === "PENDING"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {l.status}
                    </Badge>
                    {l.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={saving}
                          onClick={() => handleReview(l.id, "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving}
                          onClick={() => handleReview(l.id, "reject")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(l.startDate).toLocaleDateString()} →{" "}
                  {new Date(l.endDate).toLocaleDateString()}
                  {l.reason ? ` · ${l.reason}` : ""}
                </p>
                {l.remarks && (
                  <p className="text-xs text-muted-foreground">{l.remarks}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No leave requests
        </p>
      )}
    </div>
  );
}

/* ---------- Salary ---------- */

function SalaryTab({
  items,
  teacherId,
  onChanged,
}: {
  items: TeacherProfile["salaryRecords"];
  teacherId: string;
  onChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    effectiveDate: "",
    basicSalary: "",
    allowances: "",
    deductions: "",
    currency: "NGN",
    notes: "",
  });

  const formatMoney = (value: number, currency: string) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/teacher-salaries", {
        teacherId,
        effectiveDate: form.effectiveDate,
        basicSalary: Number(form.basicSalary),
        allowances: form.allowances ? Number(form.allowances) : 0,
        deductions: form.deductions ? Number(form.deductions) : 0,
        currency: form.currency,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm({
        effectiveDate: "",
        basicSalary: "",
        allowances: "",
        deductions: "",
        currency: "NGN",
        notes: "",
      });
      setMessage("Salary record added.");
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
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

      <Button size="sm" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Add salary"}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="s-date">Effective date</Label>
                  <Input
                    id="s-date"
                    type="date"
                    required
                    value={form.effectiveDate}
                    onChange={(e) =>
                      setForm({ ...form, effectiveDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-basic">Basic salary</Label>
                  <Input
                    id="s-basic"
                    type="number"
                    required
                    min={0}
                    value={form.basicSalary}
                    onChange={(e) =>
                      setForm({ ...form, basicSalary: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-allow">Allowances</Label>
                  <Input
                    id="s-allow"
                    type="number"
                    min={0}
                    value={form.allowances}
                    onChange={(e) =>
                      setForm({ ...form, allowances: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-ded">Deductions</Label>
                  <Input
                    id="s-ded"
                    type="number"
                    min={0}
                    value={form.deductions}
                    onChange={(e) =>
                      setForm({ ...form, deductions: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-currency">Currency</Label>
                  <Input
                    id="s-currency"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-notes">Notes</Label>
                  <Input
                    id="s-notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add salary"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((s) => (
            <Card key={s.id}>
              <CardContent className="space-y-1 pt-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {new Date(s.effectiveDate).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2">
                    {s.isActive && <Badge>Active</Badge>}
                    <Badge variant="outline">
                      {formatMoney(s.netSalary, s.currency)}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Basic {formatMoney(s.basicSalary, s.currency)} · Allowances{" "}
                  {formatMoney(s.allowances, s.currency)} · Deductions{" "}
                  {formatMoney(s.deductions, s.currency)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No salary records
        </p>
      )}
    </div>
  );
}

/* ---------- Documents ---------- */

function DocumentsTab({
  items,
  teacherId,
  onChanged,
}: {
  items: TeacherProfile["documents"];
  teacherId: string;
  onChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", category: "OTHER", notes: "" });

  const categories = [
    "CONTRACT",
    "RESUME",
    "CERTIFICATE",
    "ID_DOCUMENT",
    "MEDICAL",
    "EVALUATION",
    "OTHER",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const token =
        typeof window !== "undefined"
          ? (JSON.parse(localStorage.getItem("eduos.tokens") ?? "{}")
              .accessToken as string)
          : "";
      const tenant = JSON.parse(
        localStorage.getItem("eduos.activeTenant") ?? "{}",
      ) as { slug?: string };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"}/files/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Tenant-Id": tenant.slug ?? "",
          },
          body,
        },
      );
      const uploaded = (await res.json().catch(() => null)) as {
        success?: boolean;
        data?: { id: string };
        message?: string;
      };
      if (!res.ok || uploaded?.success === false) {
        throw new Error(uploaded?.message ?? "Upload failed");
      }
      await api.post("/teacher-documents", {
        teacherId,
        name: form.name,
        category: form.category,
        fileId: uploaded.data?.id,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setFile(null);
      setForm({ name: "", category: "OTHER", notes: "" });
      setMessage("Document linked.");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
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

      <Button size="sm" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Upload document"}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="td-name">Name</Label>
                  <Input
                    id="td-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="td-cat">Category</Label>
                  <select
                    id="td-cat"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="td-file">File</Label>
                  <Input
                    id="td-file"
                    type="file"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="td-notes">Notes</Label>
                  <Input
                    id="td-notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between pt-4 text-sm">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{d.name}</p>
                    {d.fileName && (
                      <p className="text-xs text-muted-foreground">
                        {d.fileName}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary">{d.category}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No documents
        </p>
      )}
    </div>
  );
}
