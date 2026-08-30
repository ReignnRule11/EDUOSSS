"use client";

import {
  Laptop,
  Mail,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface SessionDevice {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
}

interface Profile {
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
}

interface MfaSetup {
  secret: string;
  otpauthUrl: string;
  backupCodes: string[];
}

function deviceLabel(userAgent: string | null): {
  name: string;
  icon: typeof Laptop;
} {
  if (!userAgent) return { name: "Unknown device", icon: Laptop };
  if (/mobile|iphone|ipad|android/i.test(userAgent))
    return { name: "Mobile device", icon: Smartphone };
  if (/macintosh|windows|linux/i.test(userAgent))
    return { name: "Desktop browser", icon: MonitorSmartphone };
  return { name: "Browser", icon: Laptop };
}

export default function SecurityPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<SessionDevice[]>([]);
  const [loading, setLoading] = useState(true);

  // MFA state
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Generic
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [me, sess] = await Promise.all([
        api.get<Profile>("/auth/me"),
        api.get<SessionDevice[]>("/auth/sessions"),
      ]);
      setProfile(me.data);
      setSessions(sess.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load security settings",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSetupMfa() {
    setMfaBusy(true);
    setError(null);
    try {
      const { data } = await api.post<MfaSetup>("/auth/mfa/setup");
      setMfaSetup(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to start MFA setup",
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function handleConfirmMfa(event: FormEvent) {
    event.preventDefault();
    if (!mfaSetup) return;
    setMfaBusy(true);
    setError(null);
    try {
      await api.post("/auth/mfa/confirm", { code: mfaCode });
      setMfaSetup(null);
      setMfaCode("");
      setProfile((p) => (p ? { ...p, mfaEnabled: true } : p));
      setNotice("Two-factor authentication is now enabled");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid security code");
    } finally {
      setMfaBusy(false);
    }
  }

  async function handleDisableMfa(event: FormEvent) {
    event.preventDefault();
    setMfaBusy(true);
    setError(null);
    try {
      await api.post("/auth/mfa/disable", { password: disablePassword });
      setDisablePassword("");
      setProfile((p) => (p ? { ...p, mfaEnabled: false } : p));
      setNotice("Two-factor authentication has been disabled");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to disable MFA");
    } finally {
      setMfaBusy(false);
    }
  }

  async function handleResendVerification() {
    setMfaBusy(true);
    setError(null);
    try {
      await api.post("/auth/verify-email/send");
      setNotice("Verification email sent. Check your inbox.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to send verification email",
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg("Password updated. Other sessions have been signed out.");
    } catch (err) {
      setPasswordError(
        err instanceof ApiError ? err.message : "Unable to change password",
      );
    }
  }

  async function handleRevoke(id: string) {
    setError(null);
    try {
      await api.delete(`/auth/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to revoke session",
      );
    }
  }

  async function handleRevokeAllOthers() {
    setError(null);
    try {
      const { data } = await api.delete<{ revoked: number }>("/auth/sessions");
      setNotice(`Signed out ${data.revoked} other device(s)`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to revoke sessions",
      );
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security</h1>
        <p className="text-sm text-muted-foreground">
          Password, two-factor authentication and sign-in sessions
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Changing your password signs out your other devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {passwordError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {passwordError}
                </p>
              )}
              {passwordMsg && (
                <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                  {passwordMsg}
                </p>
              )}
              <Button type="submit">Update password</Button>
            </form>
          </CardContent>
        </Card>

        {/* Email verification + MFA */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email verification
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="text-sm">
                {profile?.emailVerifiedAt ? (
                  <Badge variant="default">Verified</Badge>
                ) : (
                  <Badge variant="secondary">Not verified</Badge>
                )}
                <p className="mt-2 text-muted-foreground">
                  {profile?.emailVerifiedAt
                    ? `Verified ${new Date(profile.emailVerifiedAt).toLocaleDateString()}`
                    : "Verify your email to unlock account recovery options."}
                </p>
              </div>
              {!profile?.emailVerifiedAt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={mfaBusy}
                >
                  Resend email
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Two-factor authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of protection with an authenticator app.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mfaSetup ? (
                <form onSubmit={handleConfirmMfa} className="space-y-4">
                  <div className="flex flex-col items-center gap-3 rounded-lg border p-4">
                    <QRCodeSVG value={mfaSetup.otpauthUrl} size={160} />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        Scan with your authenticator app or enter this key:
                      </p>
                      <p className="mt-1 font-mono text-xs break-all">
                        {mfaSetup.secret}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="mb-2 font-medium">Save your backup codes</p>
                    <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                      {mfaSetup.backupCodes.map((code) => (
                        <span key={code}>{code}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mfaCode">Enter the 6-digit code</Label>
                    <Input
                      id="mfaCode"
                      inputMode="numeric"
                      placeholder="000000"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={mfaBusy || mfaCode.length !== 6}
                    >
                      {mfaBusy ? <Spinner /> : "Enable MFA"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setMfaSetup(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : profile?.mfaEnabled ? (
                <form onSubmit={handleDisableMfa} className="space-y-3">
                  <Badge variant="default">Enabled</Badge>
                  <p className="text-sm text-muted-foreground">
                    Sign-in now requires a code from your authenticator app.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="disablePassword">
                      Current password to disable
                    </Label>
                    <Input
                      id="disablePassword"
                      type="password"
                      autoComplete="current-password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" variant="outline" disabled={mfaBusy}>
                    Disable MFA
                  </Button>
                </form>
              ) : (
                <Button onClick={handleSetupMfa} disabled={mfaBusy}>
                  {mfaBusy ? <Spinner /> : "Enable MFA"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sessions / devices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active sessions</CardTitle>
            <CardDescription>
              Devices that are currently signed in to your account
            </CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button variant="outline" size="sm" onClick={handleRevokeAllOthers}>
              Sign out other devices
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sessions</p>
          ) : (
            sessions.map((session) => {
              const { name, icon: Icon } = deviceLabel(session.userAgent);
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {name}
                        {session.current && (
                          <Badge variant="secondary">This device</Badge>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session.ipAddress ?? "Unknown IP"} · Last active{" "}
                        {new Date(session.lastUsedAt).toLocaleString()} ·{" "}
                        {session.userAgent
                          ? session.userAgent.split(" ").slice(0, 4).join(" ")
                          : "No user agent"}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(session.id)}
                    >
                      Sign out
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
