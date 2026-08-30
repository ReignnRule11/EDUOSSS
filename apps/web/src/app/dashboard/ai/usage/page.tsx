"use client";

import { Activity, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Config {
  provider: string | null;
  baseUrl: string | null;
  model: string | null;
  monthlyLimit: number | null;
  isActive: boolean;
  hasApiKey: boolean;
}

interface Usage {
  totalCalls: number;
  monthlyCalls: number;
  monthlyTokens: number;
  byFeature: Array<{ feature: string; calls: number; tokens: number }>;
  recentLogs: Array<{
    id: string;
    feature: string;
    model: string | null;
    totalTokens: number | null;
    latencyMs: number | null;
    status: string;
    error: string | null;
    createdAt: string;
    user: { email: string } | null;
  }>;
}

export default function AiUsagePage() {
  const { user } = useAuth();
  const canManage = user?.role !== "STUDENT" && user?.role !== "PARENT";

  const [usage, setUsage] = useState<Usage | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    provider: "openai",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    monthlyLimit: "1000",
    isActive: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, c] = await Promise.all([
        api.get<Usage>("/ai/usage"),
        api.get<Config>("/ai/config"),
      ]);
      setUsage(u.data);
      setConfig(c.data);
      if (c.data?.provider) {
        setForm((f) => ({
          ...f,
          provider: c.data?.provider ?? f.provider,
          baseUrl: c.data?.baseUrl ?? f.baseUrl,
          model: c.data?.model ?? f.model,
          monthlyLimit: String(c.data?.monthlyLimit ?? 1000),
          isActive: c.data?.isActive ?? true,
        }));
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load AI usage",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  async function handleSaveConfig() {
    setSaving(true);
    setError(null);
    try {
      await api.patch("/ai/config", {
        provider: form.provider,
        apiKey: form.apiKey,
        baseUrl: form.baseUrl,
        model: form.model,
        monthlyLimit: Number(form.monthlyLimit) || 1000,
        isActive: form.isActive,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        You do not have permission to view AI usage.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage & Logs</h1>
          <p className="text-sm text-muted-foreground">
            Track AI usage, limits and configure the provider
          </p>
        </div>
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
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                OpenAI configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {config && (
                <div className="sm:col-span-2 flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">
                    {config.hasApiKey
                      ? "API key configured"
                      : "Mock mode (no key)"}
                  </Badge>
                  {config.provider && (
                    <Badge variant="secondary">{config.provider}</Badge>
                  )}
                  {config.model && (
                    <Badge variant="secondary">{config.model}</Badge>
                  )}
                  {config.monthlyLimit && (
                    <Badge variant="secondary">
                      limit {config.monthlyLimit}/month
                    </Badge>
                  )}
                </div>
              )}
              <div className="space-y-1">
                <Label>Provider</Label>
                <Input
                  value={form.provider}
                  onChange={(e) =>
                    setForm({ ...form, provider: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>API key</Label>
                <Input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-1">
                <Label>Base URL</Label>
                <Input
                  value={form.baseUrl}
                  onChange={(e) =>
                    setForm({ ...form, baseUrl: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Model</Label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Monthly request limit</Label>
                <Input
                  type="number"
                  value={form.monthlyLimit}
                  onChange={(e) =>
                    setForm({ ...form, monthlyLimit: e.target.value })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-input"
                />
                Active (calls the provider when enabled and a key is set)
              </label>
              <div className="flex items-end">
                <Button
                  onClick={() => void handleSaveConfig()}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save configuration"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {usage && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Total calls
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{usage.totalCalls}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Monthly calls
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {usage.monthlyCalls}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Monthly tokens
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {usage.monthlyTokens.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Usage by feature
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {usage.byFeature.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No usage yet.
                      </p>
                    ) : (
                      usage.byFeature.map((f) => (
                        <div
                          key={f.feature}
                          className="flex items-center justify-between rounded-md border p-3 text-sm"
                        >
                          <span className="font-medium">{f.feature}</span>
                          <div className="flex gap-3">
                            <span>{f.calls} calls</span>
                            <span className="text-muted-foreground">
                              {f.tokens.toLocaleString()} tokens
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent logs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {usage.recentLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No logs yet.
                      </p>
                    ) : (
                      usage.recentLogs.map((l) => (
                        <div
                          key={l.id}
                          className="rounded-md border p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{l.feature}</span>
                            <Badge
                              variant="secondary"
                              className={
                                l.status === "SUCCESS"
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : "bg-red-500/15 text-red-600"
                              }
                            >
                              {l.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {l.user?.email ?? "system"} · {l.model ?? "—"} ·{" "}
                            {l.totalTokens ?? 0} tokens · {l.latencyMs ?? 0}ms ·{" "}
                            {new Date(l.createdAt).toLocaleString()}
                          </p>
                          {l.error && (
                            <p className="mt-1 text-xs text-red-600">
                              {l.error}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
