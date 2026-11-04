import { HttpError, ServerMessage } from '../../src/lib/failure';
import { uploadDebugLog, uploadEnabled } from '../../src/lib/logUpload';

afterEach(() => jest.restoreAllMocks());

test('posts the log text with the API and app versions and returns the reference', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ FormatVersion: 1, id: 'abc-123' }) } as never);
  expect(await uploadDebugLog('line one\n', '2026.11.04.001', 'https://logs.example/')).toEqual({ id: 'abc-123' });
  expect(fetchMock).toHaveBeenCalledWith('https://logs.example/', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-API-Version': '1', 'X-App-Version': '2026.11.04.001' },
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
  expect(uploadEnabled()).toBe(false);
  await uploadDebugLog('x', '1');
  expect(fetchMock).toHaveBeenCalledWith('', expect.any(Object));
});
