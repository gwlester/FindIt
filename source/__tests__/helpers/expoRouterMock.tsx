// expo-router mock: records navigation and renders a screen's headerRight so it can be tested.
import { useEffect, type ReactNode } from 'react';
import { Text, View } from 'react-native';

export const router = { push: jest.fn(), back: jest.fn() };

export const useLocalSearchParams = jest.fn(() => ({}) as Record<string, string>);

export function useFocusEffect(effect: () => void) {
  useEffect(() => {
    effect();
  }, [effect]);
}

type ScreenProps = { name?: string; options?: { title?: string; headerRight?: () => ReactNode } };

function Screen({ name, options }: ScreenProps) {
  return (
    <View testID={name ? `screen-${name}` : 'screen-options'}>
      {options?.title ? <Text>{`title:${options.title}`}</Text> : null}
      {options?.headerRight ? options.headerRight() : null}
    </View>
  );
}

function StackImpl({ children }: { children?: ReactNode; screenOptions?: unknown }) {
  return <View testID="stack">{children}</View>;
}

export const Stack = Object.assign(StackImpl, { Screen });
