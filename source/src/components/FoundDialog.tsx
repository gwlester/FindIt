import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../lib/theme';
import { Button, Field } from './ui';

type Props = {
  visible: boolean;
  /** Updating my existing find (once mode) rather than adding one. */
  updating: boolean;
  onSave: (comment: string) => void;
  onCancel: () => void;
};

/** Asks for an optional comment when marking a place as found. */
export function FoundDialog({ visible, updating, onSave, onCancel }: Props) {
  const theme = useTheme();
  const [comment, setComment] = useState('');
  const close = (save: boolean) => {
    if (save) onSave(comment.trim());
    else onCancel();
    setComment('');
  };
  return (
    <Modal testID="found-dialog" visible={visible} transparent animationType="fade" onRequestClose={() => close(false)}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>{updating ? 'Update find' : 'Mark as found'}</Text>
          <Field label="Comment" value={comment} onChangeText={setComment} placeholder="Comment (optional)" multiline />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="secondary" onPress={() => close(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Save find" onPress={() => close(true)} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' },
  dialog: { borderRadius: 14, borderWidth: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
});
