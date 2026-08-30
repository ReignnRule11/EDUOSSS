"use client";

import { Megaphone, Pin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  audience: string;
  createdAt: string;
  author: { firstName: string; lastName: string } | null;
}

export default function ParentAnnouncementsPage() {
  const { user } = useAuth();
  const isParent = user?.role === "PARENT";

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Announcement[]>("/parent/announcements");
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
    if (isParent) void load();
  }, [isParent, load]);

  if (!isParent) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        This portal is for parents. Sign in with a parent account.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">
          School Announcements
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No announcements right now.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <Card key={a.id} className={a.pinned ? "border-primary/40" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {a.pinned && <Pin className="h-4 w-4 text-primary" />}
                    {a.title}
                  </CardTitle>
                  <Badge variant="secondary">{a.audience}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {a.author
                    ? `${a.author.firstName} ${a.author.lastName} · `
                    : ""}
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
