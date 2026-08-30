"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Template {
  id: string;
  feature: string;
  name: string;
  prompt: string;
  variables: string[];
  isActive: boolean;
  isDefault: boolean;
}

export default function AiTemplatesPage() {
  const { user } = useAuth();
  const canManage = user?.role !== "STUDENT" && user?.role !== "PARENT";

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    feature: "LESSON_PLANNER",
    name: "",
    prompt: "",
    variables: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Template[]>("/ai/templates");
      setTemplates(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load templates",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  async function handleCreate() {
    if (!form.name.trim() || !form.prompt.trim()) {
      setError("Name and prompt are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/ai/templates", {
        feature: form.feature,
        name: form.name.trim(),
        prompt: form.prompt.trim(),
        variables: form.variables
          ? form.variables
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
          : [],
      });
      setForm({
        feature: "LESSON_PLANNER",
        name: "",
        prompt: "",
        variables: "",
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create template",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    setError(null);
    try {
      await api.delete(`/ai/templates/${id}`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to remove template",
      );
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        You do not have permission to manage prompt templates.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Prompt Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Customize the prompts behind each AI feature
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="mr-2 h-4 w-4" /> New template
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Create a prompt template
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Feature</Label>
              <select
                value={form.feature}
                onChange={(e) => setForm({ ...form, feature: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="LESSON_PLANNER">Lesson planner</option>
                <option value="QUESTION_GENERATOR">Question generator</option>
                <option value="REPORT_COMMENT">Report comment</option>
                <option value="TUTOR">Tutor</option>
                <option value="RECOMMENDATION">Recommendation</option>
                <option value="INSIGHT">Insight</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Default lesson plan"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Prompt (use {"{variable}"} placeholders)</Label>
              <textarea
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Create a lesson plan for {subject} at {classLevel} covering {topic}."
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Variables (comma separated)</Label>
              <Input
                value={form.variables}
                onChange={(e) =>
                  setForm({ ...form, variables: e.target.value })
                }
                placeholder="subject, classLevel, topic"
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Creating..." : "Create template"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : templates.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No custom templates yet — built-in defaults are used. Create one to
            override.
          </p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Built-in defaults</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  ["LESSON_PLANNER", "Lesson planner"],
                  ["QUESTION_GENERATOR", "Question generator"],
                  ["REPORT_COMMENT", "Report comment"],
                  ["TUTOR", "Tutor"],
                  ["RECOMMENDATION", "Recommendation"],
                  ["INSIGHT", "Insight"],
                ].map(([value, label]) => (
                  <div
                    key={value}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <span className="font-medium">{label}</span>
                    <Badge variant="secondary">default</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{t.feature}</Badge>
                    {t.isDefault && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-500/15 text-blue-600"
                      >
                        default
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove template"
                      onClick={() => void handleDeactivate(t.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap rounded-md bg-muted/20 p-3 text-xs text-muted-foreground">
                  {t.prompt}
                </p>
                {t.variables.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.variables.map((v) => (
                      <Badge key={v} variant="outline" className="text-xs">
                        {v}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
