// "Send log to KnG": uploads the debug log, only when the user asks. The endpoint is the
// kng-findcache-log Lambda (KnG repo, terraform/findcache_logs.tf); its address is the
// findcache_log_upload_url Terraform output.

/** Empty until the endpoint is deployed; the Send button is hidden while it is empty. */
export const LOG_UPLOAD_URL = '';
export const API_VERSION = '1';

/** Whether uploading is available, i.e. the endpoint address has been filled in. */
export function uploadEnabled(url = LOG_UPLOAD_URL): boolean {
  return url !== '';
}

export type UploadResult = { id: string };

/** Uploads the log text; resolves to the reference to quote. Throws with a readable message on failure. */
export async function uploadDebugLog(text: string, appVersion: string, url = LOG_UPLOAD_URL): Promise<UploadResult> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-API-Version': API_VERSION, 'X-App-Version': appVersion },
    body: text,
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!response.ok || !body.id) throw new Error(body.error ?? `The server answered ${response.status}`);
  return { id: body.id };
}
