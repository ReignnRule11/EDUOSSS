"use client";

import {
  ClipboardList,
  GraduationCap,
  PackageCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface OverviewData {
  students: number;
  teachers: number;
  classes: number;
  subjects: number;
  enrollments: number;
}

function useCounts() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [students, teachers, classes, subjects, enrollments] =
          await Promise.all([
            api.get<unknown>("/students?limit=1"),
            api.get<unknown>("/teachers?limit=1"),
            api.get<unknown>("/classes?limit=1"),
            api.get<unknown>("/subjects?limit=1"),
            api.get<unknown>("/enrollments?limit=1"),
          ]);
        if (cancelled) return;
        const count = (result: { meta?: Record<string, unknown> }) =>
          Number(result.meta?.totalItems ?? 0);
        setData({
          students: count(students),
          teachers: count(teachers),
          classes: count(classes),
          subjects: count(subjects),
          enrollments: count(enrollments),
        });
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof ApiError ? err.message : "Failed to load overview",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error, loading };
}

const STAT_CARDS = [
  {
    key: "students",
    label: "Students",
    icon: Users,
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    key: "teachers",
    label: "Teachers",
    icon: UsersRound,
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    key: "classes",
    label: "Classes",
    icon: GraduationCap,
    color: "bg-violet-500/10 text-violet-600",
  },
  {
    key: "subjects",
    label: "Subjects",
    icon: ClipboardList,
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    key: "enrollments",
    label: "Enrollments",
    icon: PackageCheck,
    color: "bg-rose-500/10 text-rose-600",
  },
] as const;

export default function DashboardPage() {
  const { data, error, loading } = useCounts();
  const { activeTenant, user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.firstName}. Here is what is happening in{" "}
          {activeTenant?.name}.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STAT_CARDS.map((card) => (
            <Card key={card.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.color}`}
                >
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data[card.key]}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
