"use client";

import {
  Award,
  BookOpen,
  ClipboardList,
  GraduationCap,
  ListChecks,
  MonitorPlay,
  Radio,
  Video,
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
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface MyEnrollment {
  id: string;
  status: string;
  progressPercent: number;
  enrolledAt: string;
  course: {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    thumbnailUrl: string | null;
    level: string | null;
    instructor: { id: string; firstName: string; lastName: string } | null;
  };
}

interface CourseCount {
  id: string;
  title: string;
  status: string;
  _count: { lessons: number; enrollments: number };
}

interface Certificate {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  course: { id: string; title: string };
}

export default function LmsOverviewPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";
  const [mine, setMine] = useState<MyEnrollment[]>([]);
  const [courses, setCourses] = useState<CourseCount[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mineRes, coursesRes, certRes] = await Promise.all([
        api.get<MyEnrollment[]>("/enrollments/mine").catch(() => null),
        api.get<CourseCount[]>("/courses?limit=5"),
        api.get<Certificate[]>("/certificates?limit=5"),
      ]);
      setMine(mineRes?.data ?? []);
      setCourses(coursesRes.data);
      setCertificates(certRes.data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load LMS overview",
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

  const completed = mine.filter((m) => m.status === "COMPLETED").length;
  const inProgress = mine.filter(
    (m) => m.status === "ACTIVE" && m.progressPercent > 0,
  ).length;
  const enrolled = mine.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Learning Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Courses, lessons, assignments, live classes and certificates
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-4 w-4 text-primary" /> Enrolled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{enrolled}</p>
            <p className="text-xs text-muted-foreground">
              {inProgress} in progress, {completed} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-4 w-4 text-primary" /> Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{courses.length}+</p>
            <p className="text-xs text-muted-foreground">
              available in the catalog
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-4 w-4 text-primary" /> Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{certificates.length}</p>
            <p className="text-xs text-muted-foreground">earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-4 w-4 text-primary" /> Ready to use
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">14</p>
            <p className="text-xs text-muted-foreground">
              LMS features available
            </p>
          </CardContent>
        </Card>
      </div>

      {!isStudent && (
        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>
              Manage content and monitor learning
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/dashboard/lms/courses" className={buttonVariants({})}>
              <BookOpen className="mr-2 h-4 w-4" /> Courses & Lessons
            </Link>
            <Link
              href="/dashboard/lms/certificates"
              className={buttonVariants({ variant: "outline" })}
            >
              <Award className="mr-2 h-4 w-4" /> Certificates
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              {isStudent ? "My courses" : "Your students' courses"}
            </CardTitle>
            <CardDescription>
              {isStudent
                ? "Continue where you left off"
                : "Active and completed enrollments"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mine.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No enrollments yet.{" "}
                <Link
                  href="/dashboard/lms/courses"
                  className="underline underline-offset-4"
                >
                  Browse the course catalog
                </Link>
              </p>
            ) : (
              mine.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/lms/courses/${m.course.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {m.course.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {m.course.level ?? "General"} ·{" "}
                      {m.course.instructor
                        ? `${m.course.instructor.firstName} ${m.course.instructor.lastName}`
                        : "No instructor"}
                    </p>
                  </div>
                  <div className="flex w-40 flex-col items-end gap-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Progress
                        value={m.progressPercent}
                        className="h-2 w-24"
                      />
                      <span className="font-semibold">
                        {m.progressPercent}%
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {m.status === "COMPLETED" ? "Completed" : "In progress"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Course
                catalog
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {courses.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/lms/courses/${c.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c._count.lessons} lessons · {c._count.enrollments}{" "}
                      enrolled
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      c.status === "PUBLISHED"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-amber-500/15 text-amber-600"
                    }
                  >
                    {c.status}
                  </Badge>
                </Link>
              ))}
              <Link
                href="/dashboard/lms/courses"
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                View all courses
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Recent certificates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No certificates issued yet.
                </p>
              ) : (
                certificates.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{c.course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.certificateNumber}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {new Date(c.issuedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" /> Features
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-muted-foreground" /> Video lessons
          </div>
          <div className="flex items-center gap-2">
            <MonitorPlay className="h-4 w-4 text-muted-foreground" /> Recorded
            sessions
          </div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-muted-foreground" /> Live classes
          </div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />{" "}
            Assignments & homework
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
