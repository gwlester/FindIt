import { useKeepAwake } from 'expo-keep-awake';

/** Keeps the screen on while this is rendered; render it conditionally to scope that. */
export function KeepAwake({ tag }: { tag: string }) {
  useKeepAwake(tag);
  return null;
}
