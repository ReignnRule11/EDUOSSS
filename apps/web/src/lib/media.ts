import { getAccessToken, getActiveTenant } from "./auth-storage";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

/**
 * Uploads a media file (video/audio/pdf/image) via the Files media endpoint
 * and returns the public URL to store on lessons, sessions or submissions.
 */
export async function uploadMedia(file: File): Promise<string> {
  const token = getAccessToken();
  const tenant = getActiveTenant();

  const form = new FormData();
  form.append("file", file);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenant?.slug) headers["X-Tenant-Id"] = tenant.slug;

  const response = await fetch(`${API_BASE}/files/media`, {
    method: "POST",
    headers,
    body: form,
  });

  const json = (await response.json().catch(() => null)) as {
    success: boolean;
    data?: { url: string };
    message?: string;
  } | null;

  if (!response.ok || !json?.success || !json.data?.url) {
    throw new Error(json?.message ?? "Upload failed");
  }
  return json.data.url;
}
