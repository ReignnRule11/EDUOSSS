"use client";

import {
  ArrowLeft,
  Camera,
  FileText,
  HeartPulse,
  Medal,
  RefreshCcw,
  ShieldAlert,
  User,
  Users,
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

interface StudentProfile {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  gradeLevel: string | null;
  academicStatus: string;
  dateOfBirth: string | null;
  photoUrl: string | null;
  address: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  school?: { id: string; name: string; code: string } | null;
  enrollments?: Array<{
    id: string;
    academicYear: string;
    term: string;
    status: string;
    classGroup?: { id: string; name: string } | null;
  }>;
  guardians?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    relationship: string;
    phone: string | null;
    email: string | null;
    isPrimary: boolean;
    isEmergencyContact: boolean;
    occupation: string | null;
  }>;
  medicalRecords?: Array<{
    id: string;
    recordType: string;
    title: string;
    recordDate: string | null;
    notes: string | null;
  }>;
  disciplineRecords?: Array<{
    id: string;
    category: string;
    severity: string;
    status: string;
    description: string | null;
    incidentDate: string | null;
  }>;
  documents?: Array<{
    id: string;
    category: string;
    fileName: string;
    mimeType: string | null;
    fileSize: number | null;
    notes: string | null;
  }>;
}

interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  occurredAt: string;
}

const TABS = [
  "Overview",
  "Guardians",
  "Medical",
  "Discipline",
  "Documents",
  "Timeline",
] as const;

type Tab = (typeof TABS)[number];

const STATUS_OPTIONS = ["ACTIVE", "SUSPENDED", "GRADUATED", "DROPPED"];

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<StudentProfile>(`/students/${studentId}`);
      setStudent(data);
      const { data: events } = await api.get<TimelineEvent[]>(
        `/timeline?studentId=${studentId}&limit=20`,
      );
      setTimeline(events);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load student profile",
      );
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStatus(e: React.FormEvent) {
    e.preventDefault();
    const target = e.target as HTMLFormElement;
    const status = (target.elements.namedItem("status") as HTMLSelectElement)
      .value;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.patch(`/students/${studentId}/status`, { status });
      setMessage(`Status updated to ${status}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Status update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
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
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"}/students/${studentId}/photo`,
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

  if (error && !student) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/students"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to students
        </Link>
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/students"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {student.admissionNumber} · {student.school?.name ?? "—"}
            </p>
          </div>
        </div>
        <Badge
          variant={
            student.academicStatus === "ACTIVE" ? "default" : "secondary"
          }
        >
          {student.academicStatus}
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
        {/* Left column: photo + identity + status */}
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border bg-muted">
                {student.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={student.photoUrl}
                    alt={`${student.firstName} ${student.lastName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <label
                htmlFor="photo-upload"
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent",
                  saving && "pointer-events-none opacity-50",
                )}
              >
                <Camera className="h-4 w-4" />
                Upload photo
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handlePhoto}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Student details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gender</span>
                <span>{student.gender ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grade level</span>
                <span>{student.gradeLevel ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date of birth</span>
                <span>
                  {student.dateOfBirth
                    ? new Date(student.dateOfBirth).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="text-right">{student.address ?? "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Academic status</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStatus} className="space-y-3">
                <select
                  name="status"
                  defaultValue={student.academicStatus}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" disabled={saving}>
                  Update status
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Enrollments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {student.enrollments && student.enrollments.length > 0 ? (
                student.enrollments.map((en) => (
                  <div
                    key={en.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">
                        {en.classGroup?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {en.academicYear} · {en.term}
                      </p>
                    </div>
                    <Badge variant="outline">{en.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No enrollments</p>
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

          {tab === "Overview" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    Guardian (profile)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>{student.guardianName ?? "No guardian on profile"}</p>
                  {student.guardianPhone && (
                    <p className="text-muted-foreground">
                      {student.guardianPhone}
                    </p>
                  )}
                  {student.guardianEmail && (
                    <p className="text-muted-foreground">
                      {student.guardianEmail}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <HeartPulse className="h-4 w-4" />
                    Recent medical records
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {student.medicalRecords &&
                  student.medicalRecords.length > 0 ? (
                    student.medicalRecords.slice(0, 3).map((m) => (
                      <div key={m.id} className="flex justify-between">
                        <span className="font-medium">{m.title}</span>
                        <span className="text-muted-foreground">
                          {m.recordType}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No records</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ShieldAlert className="h-4 w-4" />
                    Recent discipline records
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {student.disciplineRecords &&
                  student.disciplineRecords.length > 0 ? (
                    student.disciplineRecords.slice(0, 3).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between"
                      >
                        <span className="font-medium">
                          {d.description ?? d.category}
                        </span>
                        <Badge variant="outline">{d.status}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No records</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "Guardians" && (
            <GuardiansTab
              guardians={student.guardians}
              studentId={studentId}
              onChanged={load}
            />
          )}
          {tab === "Medical" && (
            <MedicalTab
              records={student.medicalRecords}
              studentId={studentId}
              onChanged={load}
            />
          )}
          {tab === "Discipline" && (
            <DisciplineTab
              records={student.disciplineRecords}
              studentId={studentId}
              onChanged={load}
            />
          )}
          {tab === "Documents" && (
            <DocumentsTab
              documents={student.documents}
              studentId={studentId}
              onChanged={load}
            />
          )}
          {tab === "Timeline" && <TimelineTab events={timeline} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tab components ---------- */

function GuardiansTab({
  guardians,
  studentId,
  onChanged,
}: {
  guardians: StudentProfile["guardians"];
  studentId: string;
  onChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    relationship: "PARENT",
    phone: "",
    email: "",
    occupation: "",
    isPrimary: false,
    isEmergencyContact: false,
  });

  const relationships = ["PARENT", "GUARDIAN", "SIBLING", "OTHER"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/guardians", {
        studentId,
        ...form,
        phone: form.phone || undefined,
        email: form.email || undefined,
        occupation: form.occupation || undefined,
      });
      setShowForm(false);
      setForm({
        firstName: "",
        lastName: "",
        relationship: "PARENT",
        phone: "",
        email: "",
        occupation: "",
        isPrimary: false,
        isEmergencyContact: false,
      });
      setMessage("Guardian added.");
      await onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to add guardian",
      );
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
        {showForm ? "Cancel" : "Add guardian"}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="g-first">First name</Label>
                  <Input
                    id="g-first"
                    required
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="g-last">Last name</Label>
                  <Input
                    id="g-last"
                    required
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="g-rel">Relationship</Label>
                  <select
                    id="g-rel"
                    value={form.relationship}
                    onChange={(e) =>
                      setForm({ ...form, relationship: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {relationships.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="g-phone">Phone</Label>
                  <Input
                    id="g-phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="g-email">Email</Label>
                  <Input
                    id="g-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="g-occ">Occupation</Label>
                  <Input
                    id="g-occ"
                    value={form.occupation}
                    onChange={(e) =>
                      setForm({ ...form, occupation: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-6 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.isPrimary}
                      onChange={(e) =>
                        setForm({ ...form, isPrimary: e.target.checked })
                      }
                    />
                    Primary contact
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.isEmergencyContact}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          isEmergencyContact: e.target.checked,
                        })
                      }
                    />
                    Emergency contact
                  </label>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add guardian"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {guardians && guardians.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {guardians.map((g) => (
            <Card key={g.id}>
              <CardContent className="space-y-2 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {g.firstName} {g.lastName}
                  </p>
                  <div className="flex gap-1">
                    {g.isPrimary && <Badge>Primary</Badge>}
                    {g.isEmergencyContact && (
                      <Badge variant="secondary">Emergency</Badge>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground">{g.relationship}</p>
                {g.phone && <p>{g.phone}</p>}
                {g.email && <p className="text-muted-foreground">{g.email}</p>}
                {g.occupation && (
                  <p className="text-xs text-muted-foreground">
                    {g.occupation}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No guardians recorded
        </p>
      )}
    </div>
  );
}

function MedicalTab({
  records,
  studentId,
  onChanged,
}: {
  records: StudentProfile["medicalRecords"];
  studentId: string;
  onChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    recordType: "CHECKUP",
    title: "",
    recordDate: "",
    notes: "",
  });

  const types = [
    "CHECKUP",
    "IMMUNIZATION",
    "CONDITION",
    "ALLERGY",
    "MEDICATION",
    "OTHER",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/medical-records", {
        studentId,
        ...form,
        recordDate: form.recordDate || undefined,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm({ recordType: "CHECKUP", title: "", recordDate: "", notes: "" });
      setMessage("Medical record added.");
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add record");
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
        {showForm ? "Cancel" : "Add medical record"}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="m-type">Type</Label>
                  <select
                    id="m-type"
                    value={form.recordType}
                    onChange={(e) =>
                      setForm({ ...form, recordType: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="m-title">Title</Label>
                  <Input
                    id="m-title"
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="m-date">Record date</Label>
                  <Input
                    id="m-date"
                    type="date"
                    value={form.recordDate}
                    onChange={(e) =>
                      setForm({ ...form, recordDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="m-notes">Notes</Label>
                  <Input
                    id="m-notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add record"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {records && records.length > 0 ? (
        <div className="space-y-3">
          {records.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-1 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{r.title}</p>
                  <Badge variant="secondary">{r.recordType}</Badge>
                </div>
                {r.recordDate && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.recordDate).toLocaleDateString()}
                  </p>
                )}
                {r.notes && <p className="text-muted-foreground">{r.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No medical records
        </p>
      )}
    </div>
  );
}

function DisciplineTab({
  records,
  studentId,
  onChanged,
}: {
  records: StudentProfile["disciplineRecords"];
  studentId: string;
  onChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: "MISCONDUCT",
    severity: "MINOR",
    description: "",
    incidentDate: "",
  });

  const categories = [
    "MISCONDUCT",
    "ACADEMIC_DISHONESTY",
    "BULLYING",
    "ATTENDANCE",
    "OTHER",
  ];
  const severities = ["MINOR", "MODERATE", "MAJOR"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/discipline-records", {
        studentId,
        ...form,
        incidentDate: form.incidentDate || undefined,
      });
      setShowForm(false);
      setForm({
        category: "MISCONDUCT",
        severity: "MINOR",
        description: "",
        incidentDate: "",
      });
      setMessage("Discipline record added.");
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add record");
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
        {showForm ? "Cancel" : "Add discipline record"}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="d-cat">Category</Label>
                  <select
                    id="d-cat"
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
                  <Label htmlFor="d-sev">Severity</Label>
                  <select
                    id="d-sev"
                    value={form.severity}
                    onChange={(e) =>
                      setForm({ ...form, severity: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {severities.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="d-date">Incident date</Label>
                  <Input
                    id="d-date"
                    type="date"
                    value={form.incidentDate}
                    onChange={(e) =>
                      setForm({ ...form, incidentDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="d-desc">Description</Label>
                  <Input
                    id="d-desc"
                    required
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add record"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {records && records.length > 0 ? (
        <div className="space-y-3">
          {records.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-1 pt-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{r.description ?? r.category}</p>
                  <div className="flex gap-1">
                    <Badge variant="outline">{r.severity}</Badge>
                    <Badge variant="secondary">{r.status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.category}
                  {r.incidentDate
                    ? ` · ${new Date(r.incidentDate).toLocaleDateString()}`
                    : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No discipline records
        </p>
      )}
    </div>
  );
}

function DocumentsTab({
  documents,
  studentId,
  onChanged,
}: {
  documents: StudentProfile["documents"];
  studentId: string;
  onChanged: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", category: "OTHER", notes: "" });

  const categories = [
    "BIRTH_CERTIFICATE",
    "REPORT_CARD",
    "MEDICAL",
    "TRANSFER_CERTIFICATE",
    "ID_PHOTO",
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
      body.append("studentId", studentId);
      body.append("name", form.name);
      body.append("category", form.category);
      if (form.notes) body.append("notes", form.notes);
      const token =
        typeof window !== "undefined"
          ? (JSON.parse(localStorage.getItem("eduos.tokens") ?? "{}")
              .accessToken as string)
          : "";
      const tenant = JSON.parse(
        localStorage.getItem("eduos.activeTenant") ?? "{}",
      ) as { slug?: string };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"}/student-documents/upload`,
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
        throw new Error(json?.message ?? "Upload failed");
      }
      setShowForm(false);
      setFile(null);
      setForm({ name: "", category: "OTHER", notes: "" });
      setMessage("Document uploaded.");
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
                  <Label htmlFor="doc-name">Name</Label>
                  <Input
                    id="doc-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="doc-cat">Category</Label>
                  <select
                    id="doc-cat"
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
                  <Label htmlFor="doc-file">File</Label>
                  <Input
                    id="doc-file"
                    type="file"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="doc-notes">Notes</Label>
                  <Input
                    id="doc-notes"
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

      {documents && documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between pt-4 text-sm">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{d.fileName}</p>
                    {d.notes && (
                      <p className="text-xs text-muted-foreground">{d.notes}</p>
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

function TimelineTab({ events }: { events: TimelineEvent[] }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    REGISTRATION: User,
    PROFILE_UPDATE: RefreshCcw,
    ENROLLMENT: Medal,
    PROMOTION: Medal,
    TRANSFER: RefreshCcw,
    DISCIPLINE: ShieldAlert,
    MEDICAL: HeartPulse,
    DOCUMENT: FileText,
    ATTENDANCE: User,
    STATUS_CHANGE: RefreshCcw,
    GUARDIAN: Users,
    OTHER: FileText,
  };

  if (!events || events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No timeline events
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((e) => {
        const Icon = icons[e.eventType] ?? FileText;
        return (
          <Card key={e.id}>
            <CardContent className="flex items-start gap-3 pt-4 text-sm">
              <div className="mt-0.5 rounded-md bg-muted p-1.5">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="font-medium">{e.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.occurredAt).toLocaleString()}
                  </span>
                </div>
                {e.description && (
                  <p className="text-muted-foreground">{e.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
