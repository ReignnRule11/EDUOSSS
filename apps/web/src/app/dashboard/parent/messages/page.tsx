"use client";

import { Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

interface Teacher {
  userId: string;
  name: string;
  role: string;
  subject?: string;
}

interface Message {
  id: string;
  subject: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  student: { firstName: string; lastName: string };
  sender: { id: string; firstName: string; lastName: string; role: string };
  receiver: { id: string; firstName: string; lastName: string; role: string };
}

export default function ParentMessagesPage() {
  const { user } = useAuth();
  const isParent = user?.role === "PARENT";

  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiverId, setReceiverId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Child[]>("/parent/children");
      setChildren(data);
      if (data.length > 0) setChildId(data[0]!.id);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load children",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isParent) void loadChildren();
  }, [isParent, loadChildren]);

  const loadAll = useCallback(async () => {
    try {
      const [m, u] = await Promise.all([
        api.get<Message[]>("/parent/messages?limit=100"),
        api.get<{ unread: number }>("/parent/messages/unread-count"),
      ]);
      setMessages(m.data);
      setUnread(u.data.unread);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load messages",
      );
    }
  }, []);

  useEffect(() => {
    if (isParent) void loadAll();
  }, [isParent, loadAll]);

  const loadTeachers = useCallback(async () => {
    if (!childId) return;
    try {
      const { data } = await api.get<Teacher[]>(
        `/parent/children/${childId}/teachers`,
      );
      setTeachers(data);
    } catch {
      setTeachers([]);
    }
  }, [childId]);

  useEffect(() => {
    if (childId) void loadTeachers();
  }, [childId, loadTeachers]);

  async function handleSend() {
    if (!childId || !receiverId || !subject.trim() || !body.trim()) {
      setError("Select a child, teacher, subject and message");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api.post("/parent/messages", {
        studentId: childId,
        receiverId,
        subject: subject.trim(),
        body: body.trim(),
      });
      setSubject("");
      setBody("");
      await loadAll();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to send message",
      );
    } finally {
      setSending(false);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await api.patch(`/parent/messages/${id}/read`, {});
      await loadAll();
    } catch {
      // ignore
    }
  }

  if (!isParent) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        This portal is for parents. Sign in with a parent account.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Teacher Messages
          </h1>
          <p className="text-sm text-muted-foreground">
            Message your child&apos;s teachers
          </p>
        </div>
        <Badge variant="secondary">{unread} unread</Badge>
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
      ) : children.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No children linked to your account.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compose</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Child</Label>
                <select
                  value={childId}
                  onChange={(e) => setChildId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Teacher</Label>
                <select
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select teacher</option>
                  {teachers.map((t) => (
                    <option key={t.userId} value={t.userId}>
                      {t.name} ({t.role}
                      {t.subject ? ` · ${t.subject}` : ""})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Question about homework"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Message</Label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => void handleSend()} disabled={sending}>
                  <Send className="mr-2 h-4 w-4" />
                  {sending ? "Sending..." : "Send message"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Conversation ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No messages yet. Start a conversation with a teacher.
                </p>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => {
                    const isMine = m.sender.id === user?.id;
                    const unread = m.receiver.id === user?.id && !m.readAt;
                    return (
                      <div
                        key={m.id}
                        className={`rounded-md border p-3 text-sm ${
                          unread ? "border-primary/40 bg-primary/5" : ""
                        }`}
                        onClick={() => unread && void handleMarkRead(m.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">
                            {isMine
                              ? `${m.sender.firstName} ${m.sender.lastName} (you)`
                              : `${m.sender.firstName} ${m.sender.lastName}`}
                            {" → "}
                            {m.receiver.firstName} {m.receiver.lastName}
                          </p>
                          <div className="flex items-center gap-2">
                            {unread && (
                              <Badge
                                variant="secondary"
                                className="bg-blue-500/15 text-blue-600"
                              >
                                New
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(m.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {m.student.firstName} {m.student.lastName} ·{" "}
                          {m.subject}
                        </p>
                        <p className="mt-2 text-muted-foreground">{m.body}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
