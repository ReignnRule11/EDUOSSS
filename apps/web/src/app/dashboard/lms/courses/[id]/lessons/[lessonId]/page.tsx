"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Headphones,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

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
}

interface CourseSummary {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface ProgressData {
  id: string;
  status: string;
  progressPercent: number;
  lessonProgress: {
    status: string;
    lastPosition: number | null;
    lesson: { id: string };
  }[];
}

export default function LessonPage() {
  const params = useParams<{ id: string; lessonId: string }>();
  const { id: courseId, lessonId } = params;
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [course, setCourse] = useState<CourseSummary | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const courseRes = api.get<CourseSummary>(`/courses/${courseId}`);
      const lessonRes = api.get<Lesson>(
        `/courses/${courseId}/lessons/${lessonId}`,
      );
      const [c, l] = await Promise.all([courseRes, lessonRes]);
      setCourse(c.data);
      setLesson(l.data);
      if (isStudent) {
        try {
          const { data } = await api.get<ProgressData>(
            `/enrollments/mine/${courseId}`,
          );
          setProgress(data);
        } catch {
          setProgress(null);
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId, isStudent]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !lesson || !course) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  const sorted = [...course.lessons].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  const idx = sorted.findIndex((l) => l.id === lessonId);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  const myProgress = progress?.lessonProgress.find(
    (p) => p.lesson.id === lessonId,
  );
  const completed = myProgress?.status === "COMPLETED";

  async function markComplete() {
    setSaving(true);
    try {
      await api.post(`/enrollments/mine/${courseId}/progress/${lessonId}`, {
        completed: !completed,
      });
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update progress",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/dashboard/lms/courses/${courseId}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← {course.title}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {lesson.title}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {lesson.durationMinutes ? (
              <span>{lesson.durationMinutes} min</span>
            ) : null}
            {lesson.videoUrl && (
              <span className="flex items-center gap-0.5">
                <Video className="h-3 w-3" /> Video
              </span>
            )}
            {lesson.audioUrl && (
              <span className="flex items-center gap-0.5">
                <Headphones className="h-3 w-3" /> Audio
              </span>
            )}
            {lesson.pdfUrl && (
              <span className="flex items-center gap-0.5">
                <FileText className="h-3 w-3" /> PDF
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={
              prev
                ? `/dashboard/lms/courses/${courseId}/lessons/${prev.id}`
                : `#`
            }
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm",
              prev
                ? "border-input hover:bg-muted/50"
                : "pointer-events-none opacity-50",
            )}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Link>
          <Link
            href={
              next
                ? `/dashboard/lms/courses/${courseId}/lessons/${next.id}`
                : `#`
            }
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm",
              next
                ? "border-input hover:bg-muted/50"
                : "pointer-events-none opacity-50",
            )}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {lesson.summary && (
        <p className="text-sm text-muted-foreground">{lesson.summary}</p>
      )}

      {lesson.videoUrl && (
        <video
          src={lesson.videoUrl}
          controls
          className="w-full rounded-lg border bg-black"
          style={{ maxHeight: "480px" }}
        />
      )}

      {lesson.audioUrl && !lesson.videoUrl && (
        <div className="rounded-lg border p-4">
          <audio src={lesson.audioUrl} controls className="w-full" />
        </div>
      )}

      {lesson.pdfUrl && (
        <div className="overflow-hidden rounded-lg border">
          <iframe
            src={lesson.pdfUrl}
            title={lesson.title}
            className="h-[520px] w-full"
          />
        </div>
      )}

      {lesson.content && (
        <div className="rounded-lg border p-4">
          <p className="whitespace-pre-wrap text-sm leading-6">
            {lesson.content}
          </p>
        </div>
      )}

      {isStudent && (
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm">
            {completed ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-emerald-600">
                  Lesson completed
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Not completed yet</span>
            )}
          </div>
          <Button onClick={() => void markComplete()} disabled={saving}>
            {saving
              ? "Saving..."
              : completed
                ? "Mark incomplete"
                : "Mark as complete"}
          </Button>
        </div>
      )}

      {!isStudent && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Preview as an instructor — students will see video, audio and PDF
          players here along with progress tracking.
        </div>
      )}
    </div>
  );
}
