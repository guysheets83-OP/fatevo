import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import React, { useLayoutEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { addOption, deleteOption, getOption, updateOption } from '../db';
import type { RootStackParamList } from '../navigation';
import { colors, spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OptionEdit'>;
type Route = RouteProp<RootStackParamList, 'OptionEdit'>;

/** Screen 3 — add / edit a single option (name + weight 1–5). */
export default function OptionEditScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { setId, optionId } = route.params;
  const isEditing = optionId !== undefined;

  const existing = isEditing ? getOption(optionId) : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [weight, setWeight] = useState(existing?.weight ?? 3);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit option' : 'New option' });
  }, [navigation, isEditing]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name it', 'Give this option a name first.');
      return;
    }
    try {
      if (isEditing && optionId !== undefined) {
        updateOption(optionId, name, weight);
      } else {
        addOption(setId, name, weight);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Something went wrong.');
    }
  };

  const handleDelete = () => {
    if (!isEditing || optionId === undefined) return;
    Alert.alert('Delete option?', `"${existing?.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteOption(optionId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Option name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Tacos"
        autoFocus={!isEditing}
        maxLength={60}
        returnKeyType="done"
        onSubmitEditing={handleSave}
      />

      <Text style={styles.label}>Weight — how much more likely to win</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => setWeight((w) => Math.max(1, w - 1))}
          disabled={weight <= 1}
        >
          <Text style={[styles.stepText, weight <= 1 && styles.stepDisabled]}>−</Text>
        </TouchableOpacity>
        <View style={styles.weightDisplay}>
          <Text style={styles.weightNumber}>{weight}</Text>
          <Text style={styles.weightTimes}>×</Text>
        </View>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => setWeight((w) => Math.min(5, w + 1))}
          disabled={weight >= 5}
        >
          <Text style={[styles.stepText, weight >= 5 && styles.stepDisabled]}>＋</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.weightHint}>
        {weight === 1
          ? 'Normal odds.'
          : `Wins about ${weight}× as often as a weight-1 option.`}
      </Text>

      <TouchableOpacity style={styles.save} onPress={handleSave}>
        <Text style={styles.saveText}>{isEditing ? 'Save changes' : 'Add option'}</Text>
      </TouchableOpacity>

      {isEditing && (
        <TouchableOpacity style={styles.delete} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete option</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  label: { fontSize: 14, fontWeight: '700', color: colors.muted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 17,
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  stepButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: { fontSize: 28, color: colors.ink, fontWeight: '600' },
  stepDisabled: { opacity: 0.25 },
  weightDisplay: {
    minWidth: 90,
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 14,
    padding: spacing.sm,
  },
  weightNumber: { fontSize: 34, fontWeight: '800', color: colors.ink },
  weightTimes: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  weightHint: { textAlign: 'center', color: colors.muted, fontSize: 13, marginBottom: spacing.lg },
  save: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  delete: { marginTop: spacing.md, alignItems: 'center', padding: spacing.sm },
  deleteText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
