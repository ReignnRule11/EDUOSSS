"use client";

import { Megaphone, Pin, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  audience: string;
  pinned: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  author?: { id: string; firstName: string; lastName: string };
}

const AUDIENCES = ["ALL", "STAFF", "STUDENTS", "PARENTS", "TEACHERS", "ADMIN"];

export default function AnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "ALL",
    pinned: false,
    startsAt: "",
    expiresAt: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<AnnouncementRow[]>(
        "/announcements?limit=100",
      );
      setItems(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load announcements",
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
      const payload = {
        title: form.title,
        body: form.body,
        audience: form.audience,
        pinned: form.pinned,
        startsAt: form.startsAt
          ? new Date(form.startsAt).toISOString()
          : undefined,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : undefined,
      };
      await api.post("/announcements", payload);
      setShowForm(false);
      setForm({
        title: "",
        body: "",
        audience: "ALL",
        pinned: false,
        startsAt: "",
        expiresAt: "",
      });
      setMessage("Announcement published.");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to publish announcement",
      );
    } finally {
      setSaving(false);
    }
  }

  function formatDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Communications for students, staff and parents
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "New announcement"}
        </Button>
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
              <Megaphone className="h-4 w-4" />
              New announcement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="ann-title">Title</Label>
                <Input
                  id="ann-title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ann-body">Body</Label>
                <textarea
                  id="ann-body"
                  required
                  rows={4}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="ann-audience">Audience</Label>
                  <select
                    id="ann-audience"
                    value={form.audience}
                    onChange={(e) =>
                      setForm({ ...form, audience: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a} value={a}>
                        {a.charAt(0) + a.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 pb-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.pinned}
                      onChange={(e) =>
                        setForm({ ...form, pinned: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    Pin to top
                  </label>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ann-starts">Starts at</Label>
                  <Input
                    id="ann-starts"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) =>
                      setForm({ ...form, startsAt: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ann-expires">Expires at</Label>
                  <Input
                    id="ann-expires"
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) =>
                      setForm({ ...form, expiresAt: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Publishing..." : "Publish"}
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
        <div className="space-y-4">
          {items.map((announcement) => (
            <Card
              key={announcement.id}
              className={announcement.pinned ? "border-primary" : ""}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-2">
                  {announcement.pinned && (
                    <Pin className="h-4 w-4 text-primary" />
                  )}
                  <CardTitle className="text-base">
                    {announcement.title}
                  </CardTitle>
                </div>
                <Badge variant="secondary">
                  {announcement.audience.charAt(0) +
                    announcement.audience.slice(1).toLowerCase()}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="whitespace-pre-line text-muted-foreground">
                  {announcement.body}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>
                    By {announcement.author?.firstName ?? ""}{" "}
                    {announcement.author?.lastName ?? "Unknown"}
                  </span>
                  <span>·</span>
                  <span>{formatDate(announcement.createdAt)}</span>
                  {announcement.startsAt && (
                    <>
                      <span>·</span>
                      <span>Starts {formatDate(announcement.startsAt)}</span>
                    </>
                  )}
                  {announcement.expiresAt && (
                    <>
                      <span>·</span>
                      <span>Expires {formatDate(announcement.expiresAt)}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-muted-foreground">
          No announcements found
        </p>
      )}
    </div>
  );
}
