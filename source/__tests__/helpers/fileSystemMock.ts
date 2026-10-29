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
}

export const Paths = { cache: { uri: 'file:///cache' }, document: { uri: 'file:///document' } };

export function resetFileSystemMock() {
  for (const k of Object.keys(files)) delete files[k];
}
