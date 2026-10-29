/** A place as read from or written to an exchange file (GPX / GeoJSON). */
export type ExchangePlace = {
  name: string;
  latitude: number;
  longitude: number;
  /** Horizontal accuracy in metres, if known. */
  accuracy: number | null;
  notes: string;
  /** ms since epoch, if known. */
  createdAt: number | null;
};

export type ExchangeFormat = 'gpx' | 'geojson';

export type ParseResult = {
  format: ExchangeFormat;
  places: ExchangePlace[];
  /** Entries that were not usable points (bad coordinates, tracks, polygons, …). */
  skipped: number;
};

/** Thrown when a file can't be read as GPX or GeoJSON. */
export class FormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormatError';
  }
}

export function isValidCoordinate(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}
