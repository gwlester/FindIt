import { HttpError, ServerMessage } from '../../src/lib/failure';
import { LOG_UPLOAD_URL, buildUploadText, uploadDebugLog, uploadEnabled, uploadEntryMessage } from '../../src/lib/logUpload';

afterEach(() => jest.restoreAllMocks());

test('posts the log text with the API and app versions and returns the reference', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ FormatVersion: 1, id: 'abc-123' }) } as never);
  expect(await uploadDebugLog('line one\n', '2026.11.04.001', 'https://logs.example/')).toEqual({ id: 'abc-123' });
  expect(fetchMock).toHaveBeenCalledWith('https://logs.example/', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-API-Version': '2', 'X-App-Version': '2026.11.04.001' },
    body: 'line one\n',
  });
});

test('reports the server error message', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 413, json: async () => ({ error: 'The log is too large.' }) } as never);
  await expect(uploadDebugLog('x', '1', 'https://logs.example/')).rejects.toThrow(ServerMessage);
  await expect(uploadDebugLog('x', '1', 'https://logs.example/')).rejects.toThrow('The log is too large.');
});

test('falls back to the status when the reply is not understood', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('not json'); } } as never);
  await expect(uploadDebugLog('x', '1', 'https://logs.example/')).rejects.toThrow(HttpError);
  await expect(uploadDebugLog('x', '1', 'https://logs.example/')).rejects.toThrow('The server answered 502');
});

test('uploading is enabled only once the endpoint is known', () => {
  expect(uploadEnabled('')).toBe(false);
  expect(uploadEnabled('https://logs.example/')).toBe(true);
});

test('uses the built-in endpoint by default', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'x' }) } as never);
  expect(uploadEnabled()).toBe(true);
  await uploadDebugLog('x', '1');
  expect(fetchMock).toHaveBeenCalledWith(LOG_UPLOAD_URL, expect.any(Object));
});

test('the upload text always ends with the upload entry, once, and drops anything logged after it', () => {
  const at = new Date(2026, 10, 4, 10, 30, 0, 123).getTime();
  const message = uploadEntryMessage('2026.11.04.006');
  expect(message).toMatch(/^Uploading debug log: FindCache 2026\.11\.04\.006, Android .+ \(API .+\)/);
  const entries = [
    { id: 3, at: at + 500, tag: 'gps', message: 'later' },
    { id: 2, at, tag: 'app', message },
    { id: 1, at: at - 1000, tag: 'ble', message: 'earlier' },
  ];
  const lines = buildUploadText(entries, '2026.11.04.006', at).trimEnd().split('\n');
  expect(lines).toHaveLength(2);
  expect(lines[0]).toContain('[ble] earlier');
  expect(lines[1]).toBe(`2026-11-04 10:30:00.123 [app] ${message}`);
  // With logging off nothing was stored, so the entry is added.
  expect(buildUploadText([entries[2]], '2026.11.04.006', at).trimEnd().split('\n')).toHaveLength(2);
});
