import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import { pickImportFile, shareExport } from '../../src/formats/files';

const files: Record<string, string> = {};
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    create = jest.fn();
    write = jest.fn(async (text: string) => {
      files[this.uri] = text;
    });
    text = jest.fn(async () => files[this.uri]);
  }
  return { File, Paths: { cache: { uri: 'file:///cache' } } };
});
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const PLACE = { name: 'A', latitude: 1, longitude: 2, accuracy: null, notes: '', createdAt: null };

describe('shareExport', () => {
  it('writes the file to the cache and opens the share sheet', async () => {
    const name = await shareExport([PLACE], 'geojson');
    expect(name).toMatch(/\.geojson$/);
    const uri = `file:///cache/${name}`;
    expect(JSON.parse(files[uri]).features).toHaveLength(1);
    expect(Sharing.shareAsync).toHaveBeenCalledWith(uri, {
      mimeType: 'application/geo+json',
      dialogTitle: 'Export 1 place as GeoJSON',
    });
    await shareExport([PLACE, PLACE], 'gpx');
    expect((Sharing.shareAsync as jest.Mock).mock.calls[1][1].dialogTitle).toBe('Export 2 places as GPX');
  });

  it('fails clearly when sharing is unavailable', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    await expect(shareExport([PLACE], 'gpx')).rejects.toThrow('Sharing is not available');
  });
});

describe('pickImportFile', () => {
  it('returns null when cancelled or empty', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({ canceled: true, assets: null });
    await expect(pickImportFile()).resolves.toBeNull();
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({ canceled: false, assets: [] });
    await expect(pickImportFile()).resolves.toBeNull();
  });

  it('reads and parses the picked file, detecting its format', async () => {
    files['file:///picked.gpx'] = '<gpx><wpt lat="1" lon="2"><name>A</name></wpt></gpx>';
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///picked.gpx', name: 'caches.gpx', mimeType: 'application/octet-stream' }],
    });
    const result = await pickImportFile();
    expect(DocumentPicker.getDocumentAsync).toHaveBeenLastCalledWith({ type: '*/*', copyToCacheDirectory: true });
    expect(result).toMatchObject({ fileName: 'caches.gpx', format: 'gpx', skipped: 0 });
    expect(result!.places[0].name).toBe('A');
  });
});
