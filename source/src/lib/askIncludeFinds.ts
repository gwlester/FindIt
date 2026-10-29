import { Alert } from 'react-native';

/** Asks whether found information (dates, comments) should go with exported/shared places. */
export function askIncludeFinds(): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      'Include found information?',
      'Some of these places are marked as found. Include the dates and comments?',
      [
        { text: 'Leave out', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Include', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    ),
  );
}
