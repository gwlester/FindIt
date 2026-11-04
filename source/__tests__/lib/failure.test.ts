import * as debugLogModule from '../../src/lib/debugLog';
import { friendlyMessage, HttpError, reportFailure, ServerMessage } from '../../src/lib/failure';

afterEach(() => jest.restoreAllMocks());

test.each([
  [new ServerMessage('The log is too large.'), 'The log is too large.'],
  [new HttpError(403, 'GitHub answered 403'), 'The server is busy or limiting requests right now. Please try again in a few minutes.'],
  [new HttpError(429, 'x'), 'The server is busy or limiting requests right now. Please try again in a few minutes.'],
  [new HttpError(404, 'x'), 'The server could not find what was asked for. Please try again later.'],
  [new HttpError(503, 'x'), 'The server is having problems. Please try again later.'],
  [new HttpError(400, 'x'), 'The server did not accept the request (error 400). Please try again later.'],
  [new TypeError('Network request failed'), 'Could not reach the internet. Check your connection and try again.'],
  [new Error('Unable to resolve host "api.github.com"'), 'Could not reach the internet. Check your connection and try again.'],
  [new Error('Disk full'), 'Something unexpected went wrong. Please try again.'],
  ['offline', 'Something unexpected went wrong. Please try again.'],
])('friendlyMessage(%s)', (error, expected) => {
  expect(friendlyMessage(error)).toBe(expected);
});

test('reportFailure writes the technical detail to the debug log and returns the friendly message', () => {
  const log = jest.spyOn(debugLogModule, 'debugLog').mockImplementation(() => {});
  expect(reportFailure('update', 'Checking for updates', new HttpError(403, 'GitHub answered 403'))).toMatch(/limiting requests/);
  expect(log).toHaveBeenCalledWith('update', 'Checking for updates failed: GitHub answered 403');
  reportFailure('update', 'Downloading', 'offline');
  expect(log).toHaveBeenLastCalledWith('update', 'Downloading failed: offline');
});
