// Tests the real module wrapper (the global setup mocks it for everything else).
jest.mock('expo', () => ({
  NativeModule: class {},
  requireNativeModule: jest.fn((name: string) => ({ moduleName: name })),
}));

test('loads the FindItNative native module', () => {
  const mod = jest.requireActual('../../modules/findit-native');
  const { requireNativeModule } = jest.requireMock('expo');
  expect(requireNativeModule).toHaveBeenCalledWith('FindItNative');
  expect(mod.default).toEqual({ moduleName: 'FindItNative' });
});
