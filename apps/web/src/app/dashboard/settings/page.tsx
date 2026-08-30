"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  subscriptionStatus: string;
  enabledModules: string[];
  storageUsed: string;
  storageQuota: string;
  branding: Record<string, unknown> | null;
  subscriptionExpiresAt: string | null;
}

function formatBytes(bytes: string | number): string {
  const value = Number(bytes);
  if (Number.isNaN(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / 1024 ** index).toFixed(1)} ${units[index]}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data } = await api.get<TenantSettings>("/tenant");
        if (!cancelled) setSettings(data);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load tenant settings",
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error ?? "Not found"}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tenant settings</h1>
        <p className="text-sm text-muted-foreground">
          Subscription, storage and module configuration
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{settings.name}</CardTitle>
            <CardDescription>@{settings.slug}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant={
                  settings.status === "ACTIVE" ? "default" : "destructive"
                }
              >
                {settings.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{settings.plan}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subscription</span>
              <Badge variant="secondary">{settings.subscriptionStatus}</Badge>
            </div>
            {settings.subscriptionExpiresAt && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expires</span>
                <span>
                  {new Date(
                    settings.subscriptionExpiresAt,
                  ).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
            <CardDescription>
              Object storage usage against quota
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Used</span>
              <span className="font-medium">
                {formatBytes(settings.storageUsed)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Quota</span>
              <span className="font-medium">
                {formatBytes(settings.storageQuota)}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(
                    100,
                    (Number(settings.storageUsed) /
                      Math.max(Number(settings.storageQuota), 1)) *
                      100,
                  )}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enabled modules</CardTitle>
          <CardDescription>Features active for this tenant</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {settings.enabledModules.length > 0 ? (
            settings.enabledModules.map((module) => (
              <Badge key={module} variant="secondary">
                {module}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">
              No modules enabled
            </span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
