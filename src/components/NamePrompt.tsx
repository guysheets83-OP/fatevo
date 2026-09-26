import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  saveLabel?: string;
  onCancel: () => void;
  onSave: (value: string) => void;
}

/** Reusable centered text-input dialog (Alert.prompt doesn't exist on Android). */
export default function NamePrompt({
  visible,
  title,
  placeholder,
  initialValue = '',
  saveLabel = 'Save',
  onCancel,
  onSave,
}: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            autoFocus
            maxLength={60}
            onSubmitEditing={() => value.trim() && onSave(value)}
            returnKeyType="done"
          />
          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.save, !value.trim() && styles.saveDisabled]}
              disabled={!value.trim()}
              onPress={() => onSave(value)}
            >
              <Text style={styles.saveText}>{saveLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,46,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  cancel: {
    backgroundColor: colors.background,
  },
  cancelText: {
    color: colors.muted,
    fontWeight: '600',
  },
  save: {
    backgroundColor: colors.primary,
  },
  saveDisabled: {
    opacity: 0.4,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
});
