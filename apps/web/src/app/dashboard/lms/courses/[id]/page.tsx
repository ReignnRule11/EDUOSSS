"use client";

import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Headphones,
  ListChecks,
  MonitorPlay,
  PlayCircle,
  Radio,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { uploadMedia } from "@/lib/media";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "lessons", label: "Lessons", icon: PlayCircle },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "homework", label: "Homework", icon: ListChecks },
  { id: "forum", label: "Forum", icon: BookOpen },
  { id: "live", label: "Live Classes", icon: Radio },
  { id: "recordings", label: "Recordings", icon: MonitorPlay },
  { id: "certificates", label: "Certificates", icon: Award },
];

interface Lesson {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  pdfUrl: string | null;
  orderIndex: number;
  durationMinutes: number | null;
  isFree: boolean;
}

interface LessonProgress {
  id: string;
  status: string;
  lesson: { id: string; title: string; orderIndex: number };
}

interface MyProgress {
  id: string;
  status: string;
  progressPercent: number;
  lessonProgress: LessonProgress[];
  certificate: { id: string; certificateNumber: string } | null;
}

interface CourseDetail {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  level: string | null;
  status: string;
  isFree: boolean;
  instructor: { id: string; firstName: string; lastName: string } | null;
  subject: { id: string; name: string; code: string } | null;
  lessons: Lesson[];
  _count: { lessons: number; enrollments: number };
}

interface Assignment {
  id: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  maxScore: number;
  createdBy: { firstName: string; lastName: string };
  _count: { submissions: number };
}

interface Submission {
  id: string;
  content: string | null;
  attachmentUrl: string | null;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  status: string;
  enrollment: {
    id: string;
    student: { id: string; firstName: string; lastName: string };
  };
}

interface Thread {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  author: { firstName: string; lastName: string };
  _count: { replies: number };
}

interface Reply {
  id: string;
  body: string;
  author: { firstName: string; lastName: string };
  createdAt: string;
}

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  meetingUrl: string | null;
  status: string;
  createdBy: { firstName: string; lastName: string };
}

interface RecordedSession {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  durationSeconds: number | null;
  publishedAt: string;
}

interface Certificate {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  student: { firstName: string; lastName: string };
}

type Tab = (typeof TABS)[number]["id"];

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [myProgress, setMyProgress] = useState<MyProgress | null>(null);
  const [enrolled, setEnrolled] = useState<boolean>(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [homeworks, setHomeworks] = useState<Assignment[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<{
    id: string;
    title: string;
    replies: Reply[];
  } | null>(null);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [recordings, setRecordings] = useState<RecordedSession[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  const loadCourse = useCallback(async () => {
    try {
      const { data } = await api.get<CourseDetail>(`/courses/${courseId}`);
      setCourse(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load course");
    }
  }, [courseId]);

  const loadMyProgress = useCallback(async () => {
    if (!isStudent) return;
    try {
      const { data } = await api.get<MyProgress>(
        `/enrollments/mine/${courseId}`,
      );
      setMyProgress(data);
      setEnrolled(true);
    } catch {
      setEnrolled(false);
    }
  }, [courseId, isStudent]);

  const loadTab = useCallback(async () => {
    if (!course) return;
    try {
      if (tab === "assignments") {
        const { data } = await api.get<Assignment[]>(
          `/courses/${courseId}/assignments`,
        );
        setAssignments(data);
      } else if (tab === "homework") {
        const { data } = await api.get<Assignment[]>(
          `/courses/${courseId}/homework`,
        );
        setHomeworks(data);
      } else if (tab === "forum") {
        const { data } = await api.get<Thread[]>(
          `/courses/${courseId}/forum/threads`,
        );
        setThreads(data);
      } else if (tab === "live") {
        const { data } = await api.get<LiveClass[]>(
          `/courses/${courseId}/live-classes`,
        );
        setLiveClasses(data);
      } else if (tab === "recordings") {
        const { data } = await api.get<RecordedSession[]>(
          `/courses/${courseId}/recorded-sessions`,
        );
        setRecordings(data);
      } else if (tab === "certificates") {
        const { data } = await api.get<Certificate[]>(
          `/courses/${courseId}/certificates`,
        );
        setCertificates(data);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load tab data",
      );
    }
  }, [course, courseId, tab]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    void loadMyProgress();
  }, [loadMyProgress]);

  useEffect(() => {
    setMessage(null);
    setError(null);
    void loadTab();
  }, [loadTab]);

  if (!course) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error ?? "Course not found"}
      </div>
    );
  }

  async function handlePublish(published: boolean) {
    try {
      await api.post(`/courses/${courseId}/publish`, { published });
      await loadCourse();
      setMessage(published ? "Course published" : "Course unpublished");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update course",
      );
    }
  }

  async function handleEnroll() {
    try {
      await api.post(`/courses/${courseId}/enrollments`, {});
      setEnrolled(true);
      setMessage("Enrolled in course");
      await loadMyProgress();
      await loadCourse();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to enroll");
    }
  }

  async function handleCompleteLesson(lessonId: string, completed: boolean) {
    try {
      await api.post(`/enrollments/mine/${courseId}/progress/${lessonId}`, {
        completed,
      });
      await loadMyProgress();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update progress",
      );
    }
  }

  async function handleReorder(lessonId: string, dir: number) {
    if (!course) return;
    const sorted = [...course.lessons].sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
    const idx = sorted.findIndex((l) => l.id === lessonId);
    const swap = idx + dir;
    if (swap < 0 || swap >= sorted.length) return;
    const items = sorted.map((l, i) => ({
      id: l.id,
      orderIndex:
        i === idx
          ? sorted[swap]!.orderIndex
          : i === swap
            ? sorted[idx]!.orderIndex
            : l.orderIndex,
    }));
    try {
      await api.post(`/courses/${courseId}/lessons/reorder`, { items });
      await loadCourse();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to reorder lessons",
      );
    }
  }

  const completedLessons =
    myProgress?.lessonProgress.filter((p) => p.status === "COMPLETED").length ??
    0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {course.title}
            </h1>
            <Badge
              variant="secondary"
              className={
                course.status === "PUBLISHED"
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-amber-500/15 text-amber-600"
              }
            >
              {course.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {course.level ?? "General"} ·{" "}
            {course.instructor
              ? `${course.instructor.firstName} ${course.instructor.lastName}`
              : "No instructor"}
            {course.subject ? ` · ${course.subject.name}` : ""} ·{" "}
            {course._count.lessons} lessons · {course._count.enrollments}{" "}
            enrolled
          </p>
        </div>
        <div className="flex gap-2">
          {!isStudent && (
            <Button
              variant={course.status === "PUBLISHED" ? "outline" : "default"}
              onClick={() => void handlePublish(course.status !== "PUBLISHED")}
            >
              {course.status === "PUBLISHED" ? "Unpublish" : "Publish"}
            </Button>
          )}
          {isStudent && !enrolled && course.status === "PUBLISHED" && (
            <Button onClick={() => void handleEnroll()}>Enroll</Button>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-600">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {enrolled && myProgress && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex-1 min-w-40">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Course progress</span>
                <span className="font-semibold">
                  {myProgress.progressPercent}% ({completedLessons}/
                  {course.lessons.length} lessons)
                </span>
              </div>
              <Progress value={myProgress.progressPercent} />
            </div>
            {myProgress.status === "COMPLETED" ? (
              <Badge className="bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Completed
              </Badge>
            ) : (
              <Badge variant="secondary">In progress</Badge>
            )}
            {myProgress.certificate && (
              <Link
                href="/dashboard/lms/certificates"
                className="text-sm font-medium text-primary underline underline-offset-4"
              >
                View certificate
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {course.description && tab === "overview" && (
        <Card>
          <CardHeader>
            <CardTitle>About this course</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {course.description}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-1 border-b pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-primary" /> Lessons
              </CardTitle>
              <CardDescription>
                {course.lessons.length} lessons in this course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {course.lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No lessons yet.
                  {!isStudent && " Add lessons in the Lessons tab."}
                </p>
              ) : (
                [...course.lessons]
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((l, i) => {
                    const prog = myProgress?.lessonProgress.find(
                      (p) => p.lesson.id === l.id,
                    );
                    return (
                      <div
                        key={l.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/lms/courses/${courseId}/lessons/${l.id}`}
                              className="block truncate font-medium hover:underline"
                            >
                              {l.title}
                            </Link>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {l.videoUrl && (
                                <span className="flex items-center gap-0.5">
                                  <Video className="h-3 w-3" /> Video
                                </span>
                              )}
                              {l.audioUrl && (
                                <span className="flex items-center gap-0.5">
                                  <Headphones className="h-3 w-3" /> Audio
                                </span>
                              )}
                              {l.pdfUrl && (
                                <span className="flex items-center gap-0.5">
                                  <FileText className="h-3 w-3" /> PDF
                                </span>
                              )}
                              {l.durationMinutes
                                ? ` · ${l.durationMinutes} min`
                                : ""}
                            </div>
                          </div>
                        </div>
                        {isStudent && prog && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void handleCompleteLesson(
                                l.id,
                                prog.status !== "COMPLETED",
                              )
                            }
                          >
                            {prog.status === "COMPLETED"
                              ? "Mark incomplete"
                              : "Mark complete"}
                          </Button>
                        )}
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "lessons" && (
        <LessonsTab
          course={course}
          courseId={courseId}
          isStudent={isStudent}
          onReorder={handleReorder}
          onChanged={() => void loadCourse()}
        />
      )}

      {tab === "assignments" && (
        <AssignmentsTab
          courseId={courseId}
          isStudent={isStudent}
          items={assignments}
          onSubmitted={() => void loadTab()}
        />
      )}

      {tab === "homework" && (
        <HomeworksTab
          courseId={courseId}
          isStudent={isStudent}
          items={homeworks}
          onSubmitted={() => void loadTab()}
        />
      )}

      {tab === "forum" && (
        <ForumTab
          courseId={courseId}
          threads={threads}
          activeThread={activeThread}
          setActiveThread={setActiveThread}
          onChanged={() => void loadTab()}
        />
      )}

      {tab === "live" && (
        <LiveTab
          courseId={courseId}
          items={liveClasses}
          isStudent={isStudent}
          onChanged={() => void loadTab()}
        />
      )}

      {tab === "recordings" && (
        <RecordingsTab
          courseId={courseId}
          items={recordings}
          isStudent={isStudent}
          onChanged={() => void loadTab()}
        />
      )}

      {tab === "certificates" && (
        <CertificatesTab
          courseId={courseId}
          items={certificates}
          isStudent={isStudent}
          onChanged={() => void loadTab()}
        />
      )}
    </div>
  );
}

/* ---------------- Lessons ---------------- */

function LessonsTab({
  course,
  courseId,
  isStudent,
  onReorder,
  onChanged,
}: {
  course: CourseDetail;
  courseId: string;
  isStudent: boolean;
  onReorder: (id: string, dir: number) => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    content: "",
    durationMinutes: "",
    videoUrl: "",
    audioUrl: "",
    pdfUrl: "",
  });
  const [uploading, setUploading] = useState(false);

  async function handleFile(
    field: "videoUrl" | "audioUrl" | "pdfUrl",
    file: File | null,
  ) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file);
      setForm((f) => ({ ...f, [field]: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post(`/courses/${courseId}/lessons`, {
        title: form.title,
        summary: form.summary || undefined,
        content: form.content || undefined,
        videoUrl: form.videoUrl || undefined,
        audioUrl: form.audioUrl || undefined,
        pdfUrl: form.pdfUrl || undefined,
        durationMinutes: form.durationMinutes
          ? Number(form.durationMinutes)
          : undefined,
      });
      setForm({
        title: "",
        summary: "",
        content: "",
        durationMinutes: "",
        videoUrl: "",
        audioUrl: "",
        pdfUrl: "",
      });
      setOpen(false);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create lesson");
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...course.lessons].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-primary" /> Manage lessons
          </span>
          {!isStudent && (
            <Button size="sm" onClick={() => setOpen((o) => !o)}>
              {open ? "Cancel" : "Add lesson"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {open && !isStudent && (
          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Lesson title"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Summary</Label>
              <Input
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Short description"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Content (markdown/HTML)</Label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: e.target.value })
                }
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Video</Label>
              <div className="flex gap-2">
                <Input
                  value={form.videoUrl}
                  onChange={(e) =>
                    setForm({ ...form, videoUrl: e.target.value })
                  }
                  placeholder="Paste video URL or upload"
                />
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  id="lesson-video"
                  onChange={(e) =>
                    void handleFile("videoUrl", e.target.files?.[0] ?? null)
                  }
                />
                <Button
                  variant="outline"
                  disabled={uploading}
                  onClick={() =>
                    document.getElementById("lesson-video")?.click()
                  }
                >
                  {uploading ? "..." : "Upload"}
                </Button>
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Audio</Label>
              <div className="flex gap-2">
                <Input
                  value={form.audioUrl}
                  onChange={(e) =>
                    setForm({ ...form, audioUrl: e.target.value })
                  }
                  placeholder="Paste audio URL or upload"
                />
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  id="lesson-audio"
                  onChange={(e) =>
                    void handleFile("audioUrl", e.target.files?.[0] ?? null)
                  }
                />
                <Button
                  variant="outline"
                  disabled={uploading}
                  onClick={() =>
                    document.getElementById("lesson-audio")?.click()
                  }
                >
                  Upload
                </Button>
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>PDF</Label>
              <div className="flex gap-2">
                <Input
                  value={form.pdfUrl}
                  onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
                  placeholder="Paste PDF URL or upload"
                />
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  id="lesson-pdf"
                  onChange={(e) =>
                    void handleFile("pdfUrl", e.target.files?.[0] ?? null)
                  }
                />
                <Button
                  variant="outline"
                  disabled={uploading}
                  onClick={() => document.getElementById("lesson-pdf")?.click()}
                >
                  Upload
                </Button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Creating..." : "Create lesson"}
              </Button>
            </div>
          </div>
        )}

        {sorted.map((l, i) => (
          <div
            key={l.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {i + 1}
              </span>
              <div className="min-w-0">
                <Link
                  href={`/dashboard/lms/courses/${courseId}/lessons/${l.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {l.title}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {l.videoUrl && (
                    <span className="flex items-center gap-0.5">
                      <Video className="h-3 w-3" /> Video
                    </span>
                  )}
                  {l.audioUrl && (
                    <span className="flex items-center gap-0.5">
                      <Headphones className="h-3 w-3" /> Audio
                    </span>
                  )}
                  {l.pdfUrl && (
                    <span className="flex items-center gap-0.5">
                      <FileText className="h-3 w-3" /> PDF
                    </span>
                  )}
                  {l.durationMinutes ? ` · ${l.durationMinutes} min` : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isStudent && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={i === 0}
                    onClick={() => void onReorder(l.id, -1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={i === sorted.length - 1}
                    onClick={() => void onReorder(l.id, 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Link
                href={`/dashboard/lms/courses/${courseId}/lessons/${l.id}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                Learn
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ---------------- Assignments ---------------- */

function AssignmentsTab({
  courseId,
  isStudent,
  items,
  onSubmitted,
}: {
  courseId: string;
  isStudent: boolean;
  items: Assignment[];
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    instructions: "",
    dueAt: "",
    maxScore: "100",
  });

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post(`/courses/${courseId}/assignments`, {
        title: form.title,
        instructions: form.instructions || undefined,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
        maxScore: Number(form.maxScore),
      });
      setForm({ title: "", instructions: "", dueAt: "", maxScore: "100" });
      setOpen(false);
      onSubmitted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create assignment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" /> Assignments
          </span>
          {!isStudent && (
            <Button size="sm" onClick={() => setOpen((o) => !o)}>
              {open ? "Cancel" : "New assignment"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {open && !isStudent && (
          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Instructions</Label>
              <textarea
                value={form.instructions}
                onChange={(e) =>
                  setForm({ ...form, instructions: e.target.value })
                }
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>Due date</Label>
              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>Max score</Label>
              <Input
                type="number"
                value={form.maxScore}
                onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Creating..." : "Create assignment"}
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments yet.</p>
        ) : (
          items.map((a) => (
            <AssignmentCard
              key={a.id}
              courseId={courseId}
              assignment={a}
              isStudent={isStudent}
              onSubmitted={onSubmitted}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function AssignmentCard({
  courseId,
  assignment,
  isStudent,
  onSubmitted,
}: {
  courseId: string;
  assignment: Assignment;
  isStudent: boolean;
  onSubmitted: () => void;
}) {
  const [content, setContent] = useState("");
  const [subs, setSubs] = useState<Submission[] | null>(null);

  async function openSubmissions() {
    if (subs) {
      setSubs(null);
      return;
    }
    try {
      const { data } = await api.get<Submission[]>(
        `/courses/${courseId}/assignments/${assignment.id}/submissions`,
      );
      setSubs(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load submissions");
    }
  }

  async function submit() {
    if (!content.trim()) return;
    try {
      await api.post(
        `/courses/${courseId}/assignments/${assignment.id}/submit`,
        { content },
      );
      setContent("");
      onSubmitted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit");
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{assignment.title}</p>
          <p className="text-xs text-muted-foreground">
            by {assignment.createdBy.firstName} {assignment.createdBy.lastName}
            {assignment.dueAt
              ? ` · due ${new Date(assignment.dueAt).toLocaleDateString()}`
              : ""}
            {isStudent ? "" : ` · ${assignment._count.submissions} submissions`}
          </p>
        </div>
        {!isStudent && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openSubmissions()}
          >
            {subs ? "Hide submissions" : "Submissions"}
          </Button>
        )}
      </div>
      {assignment.instructions && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {assignment.instructions}
        </p>
      )}
      {isStudent && (
        <div className="mt-3 space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your submission..."
            className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Button size="sm" onClick={() => void submit()}>
            Submit
          </Button>
        </div>
      )}
      {subs && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            subs.map((s) => (
              <SubmissionRow
                key={s.id}
                courseId={courseId}
                assignmentId={assignment.id}
                submission={s}
                maxScore={assignment.maxScore}
                onChanged={() => void openSubmissions()}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SubmissionRow({
  courseId,
  assignmentId,
  submission,
  maxScore,
  onChanged,
}: {
  courseId: string;
  assignmentId: string;
  submission: Submission;
  maxScore: number;
  onChanged: () => void;
}) {
  const [score, setScore] = useState(String(submission.score ?? ""));
  const [feedback, setFeedback] = useState(submission.feedback ?? "");

  async function grade() {
    try {
      await api.post(
        `/courses/${courseId}/assignments/${assignmentId}/submissions/${submission.id}/grade`,
        { score: Number(score), feedback: feedback || undefined },
      );
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to grade");
    }
  }

  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {submission.enrollment.student.firstName}{" "}
          {submission.enrollment.student.lastName}
        </p>
        <Badge
          variant="secondary"
          className={
            submission.status === "GRADED"
              ? "bg-emerald-500/15 text-emerald-600"
              : "bg-amber-500/15 text-amber-600"
          }
        >
          {submission.status}
        </Badge>
      </div>
      {submission.content && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
          {submission.content}
        </p>
      )}
      {submission.score !== null && (
        <p className="mt-1 text-xs text-muted-foreground">
          Score: {submission.score}/{maxScore}
          {submission.feedback ? ` · ${submission.feedback}` : ""}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Input
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder={`Score / ${maxScore}`}
          className="h-8 w-32"
        />
        <Input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback"
          className="h-8 flex-1 min-w-40"
        />
        <Button size="sm" variant="outline" onClick={() => void grade()}>
          Grade
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Homework ---------------- */

function HomeworksTab({
  courseId,
  isStudent,
  items,
  onSubmitted,
}: {
  courseId: string;
  isStudent: boolean;
  items: Assignment[];
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    instructions: "",
    dueAt: "",
    maxScore: "100",
  });

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post(`/courses/${courseId}/homework`, {
        title: form.title,
        instructions: form.instructions || undefined,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
        maxScore: Number(form.maxScore),
      });
      setForm({ title: "", instructions: "", dueAt: "", maxScore: "100" });
      setOpen(false);
      onSubmitted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create homework");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" /> Homework
          </span>
          {!isStudent && (
            <Button size="sm" onClick={() => setOpen((o) => !o)}>
              {open ? "Cancel" : "New homework"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {open && !isStudent && (
          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Instructions</Label>
              <textarea
                value={form.instructions}
                onChange={(e) =>
                  setForm({ ...form, instructions: e.target.value })
                }
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>Due date</Label>
              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>Max score</Label>
              <Input
                type="number"
                value={form.maxScore}
                onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Creating..." : "Create homework"}
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No homework yet.</p>
        ) : (
          items.map((h) => (
            <HomeworkCard
              key={h.id}
              courseId={courseId}
              homework={h}
              isStudent={isStudent}
              onSubmitted={onSubmitted}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function HomeworkCard({
  courseId,
  homework,
  isStudent,
  onSubmitted,
}: {
  courseId: string;
  homework: Assignment;
  isStudent: boolean;
  onSubmitted: () => void;
}) {
  const [content, setContent] = useState("");
  const [subs, setSubs] = useState<Submission[] | null>(null);

  async function openSubmissions() {
    if (subs) {
      setSubs(null);
      return;
    }
    try {
      const { data } = await api.get<Submission[]>(
        `/courses/${courseId}/homework/${homework.id}/submissions`,
      );
      setSubs(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load submissions");
    }
  }

  async function submit() {
    if (!content.trim()) return;
    try {
      await api.post(`/courses/${courseId}/homework/${homework.id}/submit`, {
        content,
      });
      setContent("");
      onSubmitted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit");
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{homework.title}</p>
          <p className="text-xs text-muted-foreground">
            by {homework.createdBy.firstName} {homework.createdBy.lastName}
            {homework.dueAt
              ? ` · due ${new Date(homework.dueAt).toLocaleDateString()}`
              : ""}
            {isStudent ? "" : ` · ${homework._count.submissions} submissions`}
          </p>
        </div>
        {!isStudent && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openSubmissions()}
          >
            {subs ? "Hide submissions" : "Submissions"}
          </Button>
        )}
      </div>
      {homework.instructions && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {homework.instructions}
        </p>
      )}
      {isStudent && (
        <div className="mt-3 space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your homework..."
            className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Button size="sm" onClick={() => void submit()}>
            Submit
          </Button>
        </div>
      )}
      {subs && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            subs.map((s) => (
              <SubmissionRow
                key={s.id}
                courseId={courseId}
                assignmentId={homework.id}
                submission={s}
                maxScore={homework.maxScore}
                onChanged={() => void openSubmissions()}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Forum ---------------- */

function ForumTab({
  courseId,
  threads,
  activeThread,
  setActiveThread,
  onChanged,
}: {
  courseId: string;
  threads: Thread[];
  activeThread: { id: string; title: string; replies: Reply[] } | null;
  setActiveThread: (
    t: { id: string; title: string; replies: Reply[] } | null,
  ) => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");

  async function createThread() {
    if (!title.trim() || !body.trim()) return;
    try {
      await api.post(`/courses/${courseId}/forum/threads`, { title, body });
      setTitle("");
      setBody("");
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create thread");
    }
  }

  async function openThread(id: string) {
    try {
      const { data } = await api.get<{
        id: string;
        title: string;
        replies: Reply[];
      }>(`/courses/${courseId}/forum/threads/${id}`);
      setActiveThread(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load thread");
    }
  }

  async function createReply() {
    if (!activeThread || !reply.trim()) return;
    try {
      await api.post(
        `/courses/${courseId}/forum/threads/${activeThread.id}/replies`,
        { body: reply },
      );
      setReply("");
      await openThread(activeThread.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reply");
    }
  }

  if (activeThread) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveThread(null)}
            >
              ← Back to threads
            </Button>
          </div>
          <CardTitle className="mt-2">{activeThread.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeThread.replies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No replies yet.</p>
          ) : (
            activeThread.replies.map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {r.author.firstName} {r.author.lastName}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{r.body}</p>
              </div>
            ))
          )}
          <div className="space-y-2 border-t pt-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button size="sm" onClick={() => void createReply()}>
              Reply
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" /> Discussion Forum
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 rounded-lg border p-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Start a discussion..."
            className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Button
            size="sm"
            onClick={() => void createThread()}
            className="w-fit"
          >
            Start thread
          </Button>
        </div>
        {threads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No discussions yet. Start one above.
          </p>
        ) : (
          threads.map((t) => (
            <button
              key={t.id}
              onClick={() => void openThread(t.id)}
              className="flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {t.pinned && <Badge variant="secondary">Pinned</Badge>}
                  {t.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.author.firstName} {t.author.lastName} · {t._count.replies}{" "}
                  replies
                </p>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Live Classes ---------------- */

function LiveTab({
  courseId,
  items,
  isStudent,
  onChanged,
}: {
  courseId: string;
  items: LiveClass[];
  isStudent: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    meetingUrl: "",
  });

  async function handleCreate() {
    if (!form.title.trim() || !form.startAt) return;
    setSaving(true);
    try {
      await api.post(`/courses/${courseId}/live-classes`, {
        title: form.title,
        description: form.description || undefined,
        startAt: new Date(form.startAt).toISOString(),
        endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
        meetingUrl: form.meetingUrl || undefined,
      });
      setForm({
        title: "",
        description: "",
        startAt: "",
        endAt: "",
        meetingUrl: "",
      });
      setOpen(false);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to schedule class");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      await api.patch(`/courses/${courseId}/live-classes/${id}/status`, {
        status,
      });
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" /> Live Classes
          </span>
          {!isStudent && (
            <Button size="sm" onClick={() => setOpen((o) => !o)}>
              {open ? "Cancel" : "Schedule"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {open && !isStudent && (
          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>Start</Label>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Meeting URL</Label>
              <Input
                value={form.meetingUrl}
                onChange={(e) =>
                  setForm({ ...form, meetingUrl: e.target.value })
                }
                placeholder="https://meet.example.com/..."
              />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Scheduling..." : "Schedule live class"}
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No live classes scheduled.
          </p>
        ) : (
          items.map((l) => (
            <div key={l.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(l.startAt).toLocaleString()}
                    {l.endAt
                      ? ` · ${new Date(l.endAt).toLocaleTimeString()}`
                      : ""}
                    {l.createdBy
                      ? ` · ${l.createdBy.firstName} ${l.createdBy.lastName}`
                      : ""}
                  </p>
                  {l.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {l.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className={
                    l.status === "LIVE"
                      ? "bg-red-500/15 text-red-600"
                      : l.status === "ENDED"
                        ? ""
                        : "bg-emerald-500/15 text-emerald-600"
                  }
                >
                  {l.status}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {l.meetingUrl && (
                  <a
                    href={l.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Join
                  </a>
                )}
                {!isStudent && l.status !== "LIVE" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void setStatus(l.id, "LIVE")}
                  >
                    Start live
                  </Button>
                )}
                {!isStudent && l.status !== "ENDED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void setStatus(l.id, "ENDED")}
                  >
                    End
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Recordings ---------------- */

function RecordingsTab({
  courseId,
  items,
  isStudent,
  onChanged,
}: {
  courseId: string;
  items: RecordedSession[];
  isStudent: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    durationSeconds: "",
  });
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file);
      setForm((f) => ({ ...f, videoUrl: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.videoUrl) return;
    setSaving(true);
    try {
      await api.post(`/courses/${courseId}/recorded-sessions`, {
        title: form.title,
        description: form.description || undefined,
        videoUrl: form.videoUrl,
        durationSeconds: form.durationSeconds
          ? Number(form.durationSeconds)
          : undefined,
      });
      setForm({
        title: "",
        description: "",
        videoUrl: "",
        durationSeconds: "",
      });
      setOpen(false);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add recording");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MonitorPlay className="h-4 w-4 text-primary" /> Recorded Sessions
          </span>
          {!isStudent && (
            <Button size="sm" onClick={() => setOpen((o) => !o)}>
              {open ? "Cancel" : "Add recording"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {open && !isStudent && (
          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Video</Label>
              <div className="flex gap-2">
                <Input
                  value={form.videoUrl}
                  onChange={(e) =>
                    setForm({ ...form, videoUrl: e.target.value })
                  }
                  placeholder="Paste video URL or upload"
                />
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  id="recording-video"
                  onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  variant="outline"
                  disabled={uploading}
                  onClick={() =>
                    document.getElementById("recording-video")?.click()
                  }
                >
                  {uploading ? "..." : "Upload"}
                </Button>
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Duration (seconds)</Label>
              <Input
                type="number"
                value={form.durationSeconds}
                onChange={(e) =>
                  setForm({ ...form, durationSeconds: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Saving..." : "Add recorded session"}
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recorded sessions yet.
          </p>
        ) : (
          items.map((r) => (
            <div key={r.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.publishedAt).toLocaleDateString()}
                    {r.durationSeconds
                      ? ` · ${Math.round(r.durationSeconds / 60)} min`
                      : ""}
                  </p>
                  {r.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <video
                  src={r.videoUrl}
                  controls
                  preload="metadata"
                  className="w-full max-h-64 rounded-md border"
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Certificates ---------------- */

function CertificatesTab({
  courseId,
  items,
  isStudent,
  onChanged,
}: {
  courseId: string;
  items: Certificate[];
  isStudent: boolean;
  onChanged: () => void;
}) {
  const [enrollments, setEnrollments] = useState<
    {
      id: string;
      student: { id: string; firstName: string; lastName: string };
      status: string;
    }[]
  >([]);
  const [studentId, setStudentId] = useState("");
  const [saving, setSaving] = useState(false);

  async function openIssue() {
    try {
      const { data } = await api.get<
        {
          id: string;
          student: { id: string; firstName: string; lastName: string };
          status: string;
        }[]
      >(`/courses/${courseId}/enrollments`);
      setEnrollments(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load enrollments");
    }
  }

  async function issue() {
    if (!studentId) return;
    setSaving(true);
    try {
      await api.post(`/courses/${courseId}/certificates/issue`, { studentId });
      setStudentId("");
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to issue certificate");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Certificates
          </span>
          {!isStudent && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void openIssue()}
            >
              Issue certificate
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          {isStudent
            ? "Your certificates for this course"
            : "Issued certificates for this course"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isStudent && enrollments.length > 0 && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
            <div className="space-y-1">
              <Label>Student</Label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select student</option>
                {enrollments
                  .filter((e) => e.status === "COMPLETED")
                  .map((e) => (
                    <option key={e.id} value={e.student.id}>
                      {e.student.firstName} {e.student.lastName}
                    </option>
                  ))}
              </select>
            </div>
            <Button
              onClick={() => void issue()}
              disabled={saving || !studentId}
            >
              {saving ? "Issuing..." : "Issue"}
            </Button>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No certificates issued yet. Certificates are issued automatically
            when a course is completed.
          </p>
        ) : (
          items.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">
                  {c.student.firstName} {c.student.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.certificateNumber} ·{" "}
                  {new Date(c.issuedAt).toLocaleDateString()}
                </p>
              </div>
              <Link
                href="/dashboard/lms/certificates"
                className="text-sm font-medium text-primary hover:underline"
              >
                View
              </Link>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
