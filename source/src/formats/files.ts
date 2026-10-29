// Reading and writing exchange files on the device: export writes to the cache
// directory and opens the Android share sheet; import uses the system file picker.

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { exportFileName, FORMATS, parsePlaces, serializePlaces } from './index';
import type { ExchangeFormat, ExchangePlace, ParseResult } from './types';

/** Writes the places to a file and opens the share sheet. Returns the file name. */
export async function shareExport(places: ExchangePlace[], format: ExchangeFormat): Promise<string> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  const name = exportFileName(format);
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(serializePlaces(places, format));
  await Sharing.shareAsync(file.uri, {
    mimeType: FORMATS[format].mimeType,
    dialogTitle: `Export ${places.length} place${places.length === 1 ? '' : 's'} as ${FORMATS[format].label}`,
  });
  return name;
}

export type ImportedFile = ParseResult & { fileName: string };

/**
 * Lets the user pick a GPX or GeoJSON file and parses it, choosing the format from the
 * file. Resolves to null if the user cancels. Any MIME type is allowed because Android
 * often labels .gpx files as application/octet-stream.
 */
export async function pickImportFile(): Promise<ImportedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  const content = await new File(asset.uri).text();
  return { ...parsePlaces(asset.name, asset.mimeType, content), fileName: asset.name };
}
