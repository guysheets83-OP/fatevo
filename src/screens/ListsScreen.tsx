import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import NamePrompt from '../components/NamePrompt';
import { createSet, deleteSet, getSetSummaries, getStreakState, renameSet } from '../db';
import type { RootStackParamList } from '../navigation';
import { titleForStreak } from '../streak';
import { colors, spacing } from '../theme';
import type { SetSummary } from '../db';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Lists'>;

/** Screen 1 — My Lists (home). */
export default function ListsScreen() {
  const navigation = useNavigation<Nav>();
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [promptVisible, setPromptVisible] = useState(false);
  const [editing, setEditing] = useState<SetSummary | null>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [streakTitle, setStreakTitle] = useState<string | null>(null);

  const reload = useCallback(() => {
    setSets(getSetSummaries());
    const s = getStreakState();
    setStreakCount(s.count);
    setStreakTitle(titleForStreak(s.count));
  }, []);

  useFocusEffect(reload);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            setEditing(null);
            setPromptVisible(true);
          }}
          style={styles.addButton}
          accessibilityLabel="Create new list"
        >
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleSave = (name: string) => {
    try {
      if (editing) {
        renameSet(editing.id, name);
      } else {
        const id = createSet(name);
        setPromptVisible(false);
        reload();
        navigation.navigate('SetDetail', { setId: id });
        return;
      }
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Something went wrong.');
      return;
    }
    setPromptVisible(false);
    reload();
  };

  const handleLongPress = (set: SetSummary) => {
    Alert.alert(set.name, 'What would you like to do?', [
      {
        text: 'Rename',
        onPress: () => {
          setEditing(set);
          setPromptVisible(true);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Delete list?',
            `"${set.name}" and all its options will be gone for good.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  deleteSet(set.id);
                  reload();
                },
              },
            ]
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.streakBanner}>
        <Text style={styles.streakFlame}>🔥</Text>
        <View style={styles.streakText}>
          <Text style={styles.streakCount}>
            {streakCount > 0 ? `${streakCount}-day streak` : 'Start your streak'}
          </Text>
          <Text style={styles.streakSub}>
            {streakTitle ??
              (streakCount > 0
                ? 'Roll daily to keep it alive'
                : 'Roll today to light the flame')}
          </Text>
        </View>
      </View>
      {sets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No lists yet</Text>
          <Text style={styles.emptyText}>
            Tap ＋ to create one — "Friday dinner", "Movies", "Baby names"…
          </Text>
        </View>
      ) : (
        <FlatList
          data={sets}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('SetDetail', { setId: item.id })}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={400}
            >
              <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSub}>
                  {item.optionCount} {item.optionCount === 1 ? 'option' : 'options'}
                  {item.noRepeat ? ' · no-repeat on' : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
      <Text style={styles.hint}>Long-press a list to rename or delete it.</Text>
      <NamePrompt
        visible={promptVisible}
        title={editing ? 'Rename list' : 'New list'}
        placeholder="e.g. Friday dinner"
        initialValue={editing?.name ?? ''}
        saveLabel={editing ? 'Rename' : 'Create'}
        onCancel={() => setPromptVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakFlame: { fontSize: 26, marginRight: spacing.sm },
  streakText: { flex: 1 },
  streakCount: { fontSize: 16, fontWeight: '800', color: colors.ink },
  streakSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  cardSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  chevron: { fontSize: 24, color: colors.muted },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: spacing.xs },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  hint: { textAlign: 'center', color: colors.muted, fontSize: 12, paddingBottom: spacing.md },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  addButtonText: { color: '#fff', fontSize: 22, lineHeight: 24, fontWeight: '600' },
});
