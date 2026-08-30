"use client";

import { BookOpen, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface SubjectRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  credits: number;
  isActive: boolean;
  _count?: { classSub?: number };
}

export default function SubjectsPage() {
  const [items, setItems] = useState<SubjectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    credits: "1",
  });
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<SubjectRow[]>("/subjects?limit=100");
      setItems(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load subjects",
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
      await api.post("/subjects", {
        ...form,
        credits: Number(form.credits),
      });
      setShowForm(false);
      setForm({ name: "", code: "", description: "", credits: "1" });
      setMessage("Subject created.");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create subject",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Subjects offered across the school
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "New subject"}
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
              <BookOpen className="h-4 w-4" />
              New subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="subj-name">Name</Label>
                  <Input
                    id="subj-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="subj-code">Code</Label>
                  <Input
                    id="subj-code"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="subj-credits">Credits</Label>
                  <Input
                    id="subj-credits"
                    type="number"
                    min={0}
                    value={form.credits}
                    onChange={(e) =>
                      setForm({ ...form, credits: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="subj-desc">Description</Label>
                  <Input
                    id="subj-desc"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create subject"}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((subject) => (
            <Card key={subject.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{subject.name}</span>
                  <Badge variant="outline">{subject.code}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {subject.credits}{" "}
                  {subject.credits === 1 ? "credit" : "credits"}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {subject.description && (
                  <p className="text-muted-foreground">{subject.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={subject.isActive ? "default" : "secondary"}>
                    {subject.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="secondary">
                    {subject._count?.classSub ?? 0} class assignments
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-muted-foreground">
          No subjects found
        </p>
      )}
    </div>
  );
}
