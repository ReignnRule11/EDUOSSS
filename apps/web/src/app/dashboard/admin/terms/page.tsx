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

interface SessionOption {
  id: string;
  name: string;
  code: string;
  isCurrent: boolean;
}

interface TermRow {
  id: string;
  sessionId: string;
  name: string;
  number: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  isCurrent: boolean;
  isActive: boolean;
  session?: { id: string; name: string; code: string; isCurrent: boolean };
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

export default function TermsPage() {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [items, setItems] = useState<TermRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    sessionId: "",
    name: "",
    number: "",
    startDate: "",
    endDate: "",
    status: "UPCOMING",
  });
  const [message, setMessage] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const { data } = await api.get<SessionOption[]>(
        "/academic-sessions?limit=100",
      );
      setSessions(data);
      const current = data.find((s) => s.isCurrent) ?? data[0];
      if (current) setSessionId(current.id);
    } catch {
      // Non-fatal: sessions filter just stays empty.
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (sessionId) params.set("sessionId", sessionId);
      const { data } = await api.get<TermRow[]>(`/terms?${params.toString()}`);
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load terms");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/terms", {
        sessionId: form.sessionId || sessionId,
        name: form.name,
        number: Number(form.number),
        startDate: form.startDate
          ? new Date(form.startDate).toISOString()
          : undefined,
        endDate: form.endDate
          ? new Date(form.endDate).toISOString()
          : undefined,
        status: form.status,
      });
      setShowForm(false);
      setForm({
        sessionId: "",
        name: "",
        number: "",
        startDate: "",
        endDate: "",
        status: "UPCOMING",
      });
      setMessage("Term created.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create term");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetCurrent(id: string) {
    setError(null);
    setMessage(null);
    try {
      await api.post(`/terms/${id}/set-current`);
      setMessage("Term marked as current.");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to set current term",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Academic Terms</h1>
          <p className="text-sm text-muted-foreground">
            Terms within each academic session
          </p>
        </div>
        <Button
          onClick={() => {
            setForm({ ...form, sessionId: sessionId });
            setShowForm((v) => !v);
          }}
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "New term"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="term-session" className="text-sm text-muted-foreground">
          Session
        </Label>
        <select
          id="term-session"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {sessions.length === 0 && <option value="">No sessions</option>}
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.isCurrent ? "· current" : ""}
            </option>
          ))}
        </select>
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
            <CardTitle>New academic term</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="term-session-select">Session</Label>
                  <select
                    id="term-session-select"
                    required
                    value={form.sessionId || sessionId}
                    onChange={(e) =>
                      setForm({ ...form, sessionId: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="term-number">Term number</Label>
                  <Input
                    id="term-number"
                    required
                    type="number"
                    min={1}
                    value={form.number}
                    onChange={(e) =>
                      setForm({ ...form, number: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="term-name">Name</Label>
                  <Input
                    id="term-name"
                    required
                    placeholder="First Term"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="term-start">Start date</Label>
                  <Input
                    id="term-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="term-end">End date</Label>
                  <Input
                    id="term-end"
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="term-status">Status</Label>
                  <select
                    id="term-status"
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
                  {saving ? "Creating..." : "Create term"}
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
          {items.map((term) => (
            <Card
              key={term.id}
              className={term.isCurrent ? "ring-2 ring-primary" : ""}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {term.name}
                    {term.isCurrent && (
                      <Badge className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Current
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Term {term.number} · {term.session?.name ?? "—"}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[term.status] ?? "secondary"}>
                  {term.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <p>Starts: {formatDate(term.startDate)}</p>
                  <p>Ends: {formatDate(term.endDate)}</p>
                </div>
                {!term.isCurrent && term.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetCurrent(term.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Set as current
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-muted-foreground">
          No terms found for this session
        </p>
      )}
    </div>
  );
}
