import { getAccessToken, getActiveTenant } from "./auth-storage";

/**
 * Downloads a CSV export endpoint response as a file. The API returns the CSV
 * with `Content-Disposition: attachment`, but the fetch-based client needs to
 * attach the auth + tenant headers manually, so we bypass `api.get`.
 */
export async function downloadCsv(
  path: string,
  filename: string,
): Promise<void> {
  const token = getAccessToken();
  const tenant = getActiveTenant();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenant?.slug) headers["X-Tenant-Id"] = tenant.slug;

  const base = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
  const response = await fetch(`${base}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`Export failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
