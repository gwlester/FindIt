import { File } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';

import { APK_NAME, canSelfUpdate, checkForUpdate, downloadAndInstall, isNewer, LATEST_RELEASE_URL } from '../../src/lib/updates';
import { nativeMock } from '../helpers/nativeModuleMock';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '2026.11.03.001' } } }));
jest.mock('expo-intent-launcher', () => ({ startActivityAsync: jest.fn(async () => ({ resultCode: -1 })) }));
jest.mock('expo-file-system/legacy', () => ({ getContentUriAsync: jest.fn(async (uri: string) => `content://fc${uri.slice(7)}`) }));

const release = (tag: string, assets = [{ name: APK_NAME, browser_download_url: 'https://example.com/findcache.apk' }], body = ' notes ') => ({
  ok: true,
  status: 200,
  json: async () => ({ tag_name: tag, body, assets }),
});

afterEach(() => jest.restoreAllMocks());

test.each([
  ['2026.11.04.001', '2026.11.03.001', true],
  ['2026.11.03.002', '2026.11.03.001', true],
  ['2026.11.03.001', '2026.11.03.001', false],
  ['2026.10.30.009', '2026.11.03.001', false],
  ['2026.11.03.001', '1.0.0', true],
  ['1.0.0', '2026.11.03.001', false],
  ['2026.11.3', '2026.11.03.000', false],
  ['x', '1', false],
])('isNewer(%s, %s) is %s', (candidate, current, expected) => {
  expect(isNewer(candidate, current)).toBe(expected);
});

test('canSelfUpdate asks the native module', () => {
  expect(canSelfUpdate()).toBe(true);
  nativeMock.canSelfUpdate.mockReturnValueOnce(false);
  expect(canSelfUpdate()).toBe(false);
});

describe('checkForUpdate', () => {
  it('returns the newer release with its APK link and notes', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(release('2026.11.04.001') as never);
    expect(await checkForUpdate()).toEqual({ version: '2026.11.04.001', apkUrl: 'https://example.com/findcache.apk', notes: 'notes' });
    expect(fetchMock).toHaveBeenCalledWith(LATEST_RELEASE_URL, expect.any(Object));
  });

  it('accepts a v prefix and a missing body', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ...release('v2026.11.05.001'), json: async () => ({ tag_name: 'v2026.11.05.001', body: null, assets: [{ name: APK_NAME, browser_download_url: 'u' }] }) } as never);
    expect(await checkForUpdate()).toMatchObject({ version: '2026.11.05.001', notes: '' });
  });

  it('returns null when already current, or the release has no APK or tag', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(release('2026.11.03.001') as never);
    expect(await checkForUpdate()).toBeNull();
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(release('2026.11.09.001', []) as never);
    expect(await checkForUpdate()).toBeNull();
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as never);
    expect(await checkForUpdate()).toBeNull();
  });

  it('tolerates a release with no asset list', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ tag_name: '2026.12.01.001' }) } as never);
    expect(await checkForUpdate()).toBeNull();
  });

  it('throws when GitHub cannot be reached', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 403 } as never);
    await expect(checkForUpdate()).rejects.toThrow('GitHub answered 403');
  });
});

test('downloadAndInstall downloads the APK and opens the installer on it', async () => {
  await downloadAndInstall({ version: '2026.11.04.001', apkUrl: 'https://example.com/findcache.apk', notes: '' });
  expect(File.downloadFileAsync).toHaveBeenCalledWith('https://example.com/findcache.apk', expect.objectContaining({ uri: 'file:///cache/findcache-2026.11.04.001.apk' }));
  expect(getContentUriAsync).toHaveBeenCalledWith('file:///cache/findcache-2026.11.04.001.apk');
  expect(startActivityAsync).toHaveBeenCalledWith('android.intent.action.INSTALL_PACKAGE', {
    data: 'content://fc/cache/findcache-2026.11.04.001.apk',
    flags: 1,
    type: 'application/vnd.android.package-archive',
  });
});
