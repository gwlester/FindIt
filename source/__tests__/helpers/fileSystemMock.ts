// expo-file-system (File / Paths API) mock backed by an in-memory map of uri → text.
export const files: Record<string, string> = {};

export class File {
  uri: string;
  constructor(...parts: (string | { uri: string })[]) {
    this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
  }
  get exists() {
    return this.uri in files;
  }
  create = jest.fn(() => {
    files[this.uri] ??= '';
  });
  write = jest.fn((text: string) => {
    files[this.uri] = text;
  });
  text = jest.fn(async () => files[this.uri]);
  delete = jest.fn(() => {
    delete files[this.uri];
  });
  // Like the real one, refuses to overwrite.
  static downloadFileAsync = jest.fn(async (_url: string, destination: File) => {
    if (destination.exists) throw new Error('Destination already exists');
    files[destination.uri] = '';
    return destination;
  });
}

export class Directory {
  uri: string;
  constructor(...parts: (string | { uri: string })[]) {
    this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
  }
  list() {
    return Object.keys(files)
      .filter((uri) => uri.startsWith(`${this.uri}/`) && !uri.slice(this.uri.length + 1).includes('/'))
      .map((uri) => new File(uri));
  }
}

export const Paths = { cache: { uri: 'file:///cache' }, document: { uri: 'file:///document' } };

export function resetFileSystemMock() {
  for (const k of Object.keys(files)) delete files[k];
}
