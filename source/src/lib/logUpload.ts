// "Send log to KnG": uploads the debug log, only when the user asks. The endpoint is the
// kng-findcache-log Lambda (KnG repo, terraform/findcache_logs.tf); its address is the
// findcache_log_upload_url Terraform output.

import { describeApp } from './appInfo';
import { debugLog, formatDebugLog, type DebugEntry } from './debugLog';
import { HttpError, ServerMessage } from './failure';

/** The KnG log-upload endpoint; the Send button is hidden if this is ever empty. */
export const LOG_UPLOAD_URL = 'https://6bjcezhnmuwnvuzighkzbppafq0ddjks.lambda-url.us-east-1.on.aws/';
export const API_VERSION = '3';
/** The longest problem description the server accepts. */
export const MAX_DESCRIPTION_LENGTH = 1000;

/** Whether uploading is available, i.e. the endpoint address has been filled in. */
export function uploadEnabled(url = LOG_UPLOAD_URL): boolean {
  return url !== '';
}

/** The entry the server requires as the last line of an uploaded log. */
export function uploadEntryMessage(version: string): string {
  return `Uploading debug log: ${describeApp(version)}`;
}

/** The log text to send: everything up to now, ending with the upload entry (whether or not logging is on). */
export function buildUploadText(entries: DebugEntry[], version: string, at: number): string {
  const message = uploadEntryMessage(version);
  const history = entries.filter((e) => e.at <= at && !(e.tag === 'app' && e.at === at && e.message === message));
  return formatDebugLog([...history, { id: Number.MAX_SAFE_INTEGER, at, tag: 'app', message }]);
}

export type UploadResult = { id: string };

/** Uploads the log text with the user's description of the problem; resolves to the reference to quote. Throws with a readable message on failure. */
export async function uploadDebugLog(text: string, description: string, appVersion: string, url = LOG_UPLOAD_URL): Promise<UploadResult> {
  debugLog('upload', `Sending ${text.length} characters`);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-API-Version': API_VERSION, 'X-App-Version': appVersion },
    body: JSON.stringify({ description, log: text }),
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
  if (response.ok && body.id) {
    debugLog('upload', `Log uploaded as ${body.id}`);
    return { id: body.id };
  }
  if (body.error) throw new ServerMessage(body.error);
  throw new HttpError(response.status, `The server answered ${response.status}`);
}
