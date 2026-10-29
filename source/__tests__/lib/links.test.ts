import { DOWNLOAD_URL } from '../../src/lib/links';

test('the download link is the latest release APK on GitHub', () => {
  expect(DOWNLOAD_URL).toBe('https://github.com/gwlester/findit/releases/latest/download/findcache.apk');
});
