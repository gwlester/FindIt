import appJson from '../app.json';

test('the app is called FindCache with its own Play package id', () => {
  expect(appJson.expo.name).toBe('FindCache');
  expect(appJson.expo.slug).toBe('findcache');
  expect(appJson.expo.scheme).toBe('findcache');
  expect(appJson.expo.android.package).toBe('com.gwlester.findcache');
});

test('blocks the draw-over-other-apps permission that libraries add to the manifest', () => {
  expect(appJson.expo.android.blockedPermissions).toContain('android.permission.SYSTEM_ALERT_WINDOW');
});
