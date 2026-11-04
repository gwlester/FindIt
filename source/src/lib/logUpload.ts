// "Send log to KnG": uploads the debug log, only when the user asks. The endpoint is the
// kng-findcache-log Lambda (KnG repo, terraform/findcache_logs.tf); its address is the
// findcache_log_upload_url Terraform output.

import { debugLog } from './debugLog';
import { HttpError, ServerMessage } from './failure';

/** The KnG log-upload endpoint; the Send button is hidden if this is ever empty. */
export const LOG_UPLOAD_URL = 'https://6bjcezhnmuwnvuzighkzbppafq0ddjks.lambda-url.us-east-1.on.aws/';
export const API_VERSION = '1';

/** Whether uploading is available, i.e. the endpoint address has been filled in. */
export function uploadEnabled(url = LOG_UPLOAD_URL): boolean {
  return url !== '';
}

export type UploadResult = { id: string };

/** Uploads the log text; resolves to the reference to quote. Throws with a readable message on failure. */
export async function uploadDebugLog(text: string, appVersion: string, url = LOG_UPLOAD_URL): Promise<UploadResult> {
  debugLog('upload', `Sending ${text.length} characters`);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-API-Version': API_VERSION, 'X-App-Version': appVersion },
    body: text,
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
  if (response.ok && body.id) {
    debugLog('upload', `Log uploaded as ${body.id}`);
    return { id: body.id };
  }
  if (body.error) throw new ServerMessage(body.error);
  throw new HttpError(response.status, `The server answered ${response.status}`);
}
