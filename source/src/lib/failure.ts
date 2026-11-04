// Turns a failure into a plain-language message for the user, and records the technical detail in
// the debug log (when logging is on) so it can be diagnosed later.

import { debugLog } from './debugLog';

/** A server answered with an error status. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** An error whose message was written for the user (for example by our own server) and is shown as is. */
export class ServerMessage extends Error {}

const NETWORK = /network|timed? ?out|unable to resolve|failed to connect|unknown host|offline|econn/i;

export function friendlyMessage(error: unknown): string {
  if (error instanceof ServerMessage) return error.message;
  if (error instanceof HttpError) {
    if (error.status === 403 || error.status === 429) {
      return 'The server is busy or limiting requests right now. Please try again in a few minutes.';
    }
    if (error.status === 404) return 'The server could not find what was asked for. Please try again later.';
    if (error.status >= 500) return 'The server is having problems. Please try again later.';
    return `The server did not accept the request (error ${error.status}). Please try again later.`;
  }
  if (error instanceof TypeError || (error instanceof Error && NETWORK.test(error.message))) {
    return 'Could not reach the internet. Check your connection and try again.';
  }
  return 'Something unexpected went wrong. Please try again.';
}

/** Logs "<action> failed: <detail>" under `tag` and returns the message to show the user. */
export function reportFailure(tag: string, action: string, error: unknown): string {
  debugLog(tag, `${action} failed: ${error instanceof Error ? error.message : String(error)}`);
  return friendlyMessage(error);
}
