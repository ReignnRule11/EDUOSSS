"use client";

import { CheckCircle2, Plus, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface SessionRow {
  id: string;
  name: string;
  code: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  isCurrent: boolean;
  isActive: boolean;
  _count?: { terms?: number };
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  ACTIVE: "default",
  UPCOMING: "secondary",
  COMPLETED: "outline",
  CLOSED: "destructive",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SessionsPage() {
  const [items, setItems] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    startDate: "",
    endDate: "",
    status: "UPCOMING",
  });
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<SessionRow[]>(
        "/academic-sessions?limit=100",
      );
      setItems(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load sessions",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/academic-sessions", {
        ...form,
        startDate: form.startDate
          ? new Date(form.startDate).toISOString()
          : undefined,
        endDate: form.endDate
          ? new Date(form.endDate).toISOString()
          : undefined,
      });
      setShowForm(false);
      setForm({
        name: "",
        code: "",
        startDate: "",
        endDate: "",
        status: "UPCOMING",
      });
      setMessage("Academic session created.");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create session",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSetCurrent(id: string, name: string) {
    setError(null);
    setMessage(null);
    try {
      await api.post(`/academic-sessions/${id}/set-current`);
      setMessage(`"${name}" is now the current session.`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to set current session",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Academic Sessions
          </h1>
          <p className="text-sm text-muted-foreground">
            Academic years and their current active state
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "New session"}
        </Button>
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

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New academic session</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="session-name">Name</Label>
                  <Input
                    id="session-name"
                    required
                    placeholder="2027/2028 Academic Year"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="session-code">Code</Label>
                  <Input
                    id="session-code"
                    required
                    placeholder="2027-2028"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="session-start">Start date</Label>
                  <Input
                    id="session-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="session-end">End date</Label>
                  <Input
                    id="session-end"
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="session-status">Status</Label>
                  <select
                    id="session-status"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create session"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((session) => (
            <Card
              key={session.id}
              className={session.isCurrent ? "ring-2 ring-primary" : ""}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {session.name}
                    {session.isCurrent && (
                      <Badge className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Current
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {session.code}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[session.status] ?? "secondary"}>
                  {session.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <p>Starts: {formatDate(session.startDate)}</p>
                  <p>Ends: {formatDate(session.endDate)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {session._count?.terms ?? 0} terms
                  </span>
                  {!session.isCurrent && session.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetCurrent(session.id, session.name)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Set as current
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-muted-foreground">
          No sessions found
        </p>
      )}
    </div>
  );
}
