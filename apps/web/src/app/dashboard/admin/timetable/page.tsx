"use client";

import { CalendarClock, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface SchoolOption {
  id: string;
  name: string;
  code: string;
}

interface ClassOption {
  id: string;
  name: string;
  gradeLevel: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
  staffNumber: string;
}

interface SessionOption {
  id: string;
  name: string;
  code: string;
  isCurrent: boolean;
}

interface TermOption {
  id: string;
  name: string;
  number: number;
  sessionId: string;
  isCurrent: boolean;
}

interface TimetableSlot {
  id: string;
  schoolId: string;
  sessionId: string;
  termId: string;
  classGroupId: string;
  subjectId: string;
  teacherId: string;
  departmentId: string | null;
  weekday: string;
  startTime: string;
  endTime: string;
  room: string | null;
  isActive: boolean;
  classGroup?: { id: string; name: string; gradeLevel: string };
  subject?: { id: string; name: string; code: string };
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    staffNumber: string;
  };
  term?: { id: string; name: string; number: number };
}

interface ClassGrid {
  days: { weekday: string; slots: TimetableSlot[] }[];
}

const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export default function TimetablePage() {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const [gridClassId, setGridClassId] = useState<string>("");
  const [gridTermId, setGridTermId] = useState<string>("");
  const [grid, setGrid] = useState<ClassGrid | null>(null);
  const [gridLoading, setGridLoading] = useState(false);
  const [form, setForm] = useState({
    schoolId: "",
    sessionId: "",
    termId: "",
    classGroupId: "",
    subjectId: "",
    teacherId: "",
    weekday: "MONDAY",
    startTime: "08:00",
    endTime: "08:45",
    room: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const currentSession = useMemo(
    () => sessions.find((s) => s.isCurrent) ?? null,
    [sessions],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<TimetableSlot[]>("/timetable?limit=100");
      setSlots(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load timetable",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void Promise.all([
      api
        .get<SchoolOption[]>("/schools?limit=100")
        .then(({ data }) => setSchools(data)),
      api
        .get<ClassOption[]>("/classes?limit=100")
        .then(({ data }) => setClasses(data)),
      api
        .get<SubjectOption[]>("/subjects?limit=100")
        .then(({ data }) => setSubjects(data)),
      api
        .get<TeacherOption[]>("/teachers?limit=100")
        .then(({ data }) => setTeachers(data)),
      api
        .get<SessionOption[]>("/academic-sessions?limit=100")
        .then(({ data }) => setSessions(data)),
    ]).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.sessionId) {
      api
        .get<TermOption[]>(`/terms?limit=100&sessionId=${form.sessionId}`)
        .then(({ data }) => setTerms(data))
        .catch(() => {});
    } else {
      setTerms([]);
    }
  }, [form.sessionId]);

  useEffect(() => {
    if (currentSession) {
      setForm((f) => ({ ...f, sessionId: currentSession.id }));
    }
  }, [currentSession]);

  async function loadGrid() {
    if (!gridClassId) return;
    setGridLoading(true);
    setError(null);
    try {
      const query = gridTermId ? `?termId=${gridTermId}` : "";
      const { data } = await api.get<ClassGrid>(
        `/timetable/classes/${gridClassId}${query}`,
      );
      setGrid(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load class timetable",
      );
    } finally {
      setGridLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/timetable", { ...form, room: form.room || undefined });
      setShowForm(false);
      setMessage("Timetable slot created.");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to create timetable slot",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timetable</h1>
          <p className="text-sm text-muted-foreground">
            Weekly lesson slots for classes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border">
            {(["list", "grid"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm capitalize ${
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            {showForm ? "Cancel" : "New slot"}
          </Button>
        </div>
      </div>

      {message && !showForm && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              New timetable slot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="tt-school">School</Label>
                  <select
                    id="tt-school"
                    required
                    value={form.schoolId}
                    onChange={(e) =>
                      setForm({ ...form, schoolId: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {schools.length === 0 && (
                      <option value="">No schools</option>
                    )}
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tt-session">Session</Label>
                  <select
                    id="tt-session"
                    required
                    value={form.sessionId}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        sessionId: e.target.value,
                        termId: "",
                      });
                    }}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {sessions.length === 0 && (
                      <option value="">No sessions</option>
                    )}
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.isCurrent ? " (current)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tt-term">Term</Label>
                  <select
                    id="tt-term"
                    required
                    value={form.termId}
                    onChange={(e) =>
                      setForm({ ...form, termId: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {terms.length === 0 && (
                      <option value="">Select a session first</option>
                    )}
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.isCurrent ? " (current)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tt-class">Class</Label>
                  <select
                    id="tt-class"
                    required
                    value={form.classGroupId}
                    onChange={(e) =>
                      setForm({ ...form, classGroupId: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {classes.length === 0 && (
                      <option value="">No classes</option>
                    )}
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tt-subject">Subject</Label>
                  <select
                    id="tt-subject"
                    required
                    value={form.subjectId}
                    onChange={(e) =>
                      setForm({ ...form, subjectId: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {subjects.length === 0 && (
                      <option value="">No subjects</option>
                    )}
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tt-teacher">Teacher</Label>
                  <select
                    id="tt-teacher"
                    required
                    value={form.teacherId}
                    onChange={(e) =>
                      setForm({ ...form, teacherId: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {teachers.length === 0 && (
                      <option value="">No teachers</option>
                    )}
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName} ({t.staffNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tt-weekday">Day</Label>
                  <select
                    id="tt-weekday"
                    value={form.weekday}
                    onChange={(e) =>
                      setForm({ ...form, weekday: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d} value={d}>
                        {d.charAt(0) + d.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tt-start">Start time</Label>
                  <Input
                    id="tt-start"
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tt-end">End time</Label>
                  <Input
                    id="tt-end"
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tt-room">Room</Label>
                  <Input
                    id="tt-room"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create slot"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {view === "grid" ? (
        <Card>
          <CardHeader>
            <CardTitle>Weekly timetable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="grid-class">Class</Label>
                <select
                  id="grid-class"
                  value={gridClassId}
                  onChange={(e) => {
                    setGridClassId(e.target.value);
                    setGrid(null);
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="grid-term">Term (optional)</Label>
                <select
                  id="grid-term"
                  value={gridTermId}
                  onChange={(e) => setGridTermId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">All terms</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => void loadGrid()}
                disabled={!gridClassId || gridLoading}
              >
                {gridLoading ? "Loading..." : "Show timetable"}
              </Button>
            </div>

            {gridLoading ? (
              <div className="flex justify-center py-16">
                <Spinner className="h-6 w-6 text-muted-foreground" />
              </div>
            ) : grid ? (
              <div className="space-y-4">
                {grid.days.map((day) => (
                  <div key={day.weekday}>
                    <h3 className="mb-2 text-sm font-semibold">
                      {day.weekday.charAt(0) +
                        day.weekday.slice(1).toLowerCase()}
                    </h3>
                    {day.slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No lessons
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {day.slots.map((slot) => (
                          <Card key={slot.id} className="p-3">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="font-medium">
                                {slot.subject?.name ?? "—"}
                              </span>
                              <Badge variant="outline">
                                {slot.startTime}–{slot.endTime}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {slot.teacher
                                ? `${slot.teacher.firstName} ${slot.teacher.lastName}`
                                : "—"}
                              {slot.room ? ` · ${slot.room}` : ""}
                            </p>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                Select a class and click &quot;Show timetable&quot;
              </p>
            )}
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : slots && slots.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Day</th>
                    <th className="pb-2 pr-4 font-medium">Time</th>
                    <th className="pb-2 pr-4 font-medium">Class</th>
                    <th className="pb-2 pr-4 font-medium">Subject</th>
                    <th className="pb-2 pr-4 font-medium">Teacher</th>
                    <th className="pb-2 font-medium">Term</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 capitalize">
                        {slot.weekday.toLowerCase()}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {slot.startTime}–{slot.endTime}
                        {slot.room ? ` · ${slot.room}` : ""}
                      </td>
                      <td className="py-2 pr-4">
                        {slot.classGroup?.name ?? "—"}
                      </td>
                      <td className="py-2 pr-4">{slot.subject?.name ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {slot.teacher
                          ? `${slot.teacher.firstName} ${slot.teacher.lastName}`
                          : "—"}
                      </td>
                      <td className="py-2">{slot.term?.name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="py-10 text-center text-muted-foreground">
          No timetable slots found
        </p>
      )}
    </div>
  );
}
