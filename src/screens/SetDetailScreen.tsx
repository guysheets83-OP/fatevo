import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getDrawnIds,
  getOptions,
  getSet,
  getStreakState,
  markDrawn,
  resetDrawn,
  saveStreakState,
  setNoRepeat,
  type OptionSet,
  type SetOption,
} from '../db';
import { pickNoRepeat, pickWinner } from '../roll';
import { computeRoll, todayLocal, type RollStreakResult } from '../streak';
import type { RootStackParamList } from '../navigation';
import { colors, spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SetDetail'>;
type Route = RouteProp<RootStackParamList, 'SetDetail'>;

export interface RollOutcome {
  winner: SetOption;
  streak: RollStreakResult;
}

/** Shared roll logic: honors no-repeat mode, persists deck-draw state, records the daily streak. */
export function performRoll(setId: number): RollOutcome {
  const set = getSet(setId);
  if (!set) throw new Error('List not found.');
  const options = getOptions(setId);
  if (options.length < 2) throw new Error('Add at least 2 options before rolling.');
  let winner: SetOption;
  if (!set.noRepeat) {
    winner = pickWinner(options);
  } else {
    const drawnIds = getDrawnIds(setId);
    const { winner: w, poolWasReset } = pickNoRepeat(options, drawnIds);
    if (poolWasReset) resetDrawn(setId);
    markDrawn(setId, w.id);
    winner = w;
  }
  // Daily streak: one roll per day counts; same-day repeats are idempotent.
  const { next, result } = computeRoll(getStreakState(), todayLocal());
  saveStreakState(next);
  return { winner, streak: result };
}

/** Screen 2 — list detail: options, weights, no-repeat toggle, big ROLL. */
export default function SetDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { setId } = route.params;

  const [set, setSet] = useState<OptionSet | null>(null);
  const [options, setOptions] = useState<SetOption[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);

  const reload = useCallback(() => {
    const s = getSet(setId);
    if (!s) {
      // List was deleted elsewhere — go home.
      navigation.popToTop();
      return;
    }
    setSet(s);
    const opts = getOptions(setId);
    setOptions(opts);
    if (s.noRepeat) {
      const drawn = getDrawnIds(setId);
      setRemaining(Math.max(0, opts.length - drawn.length));
    } else {
      setRemaining(null);
    }
  }, [setId, navigation]);

  useFocusEffect(reload);

  useLayoutEffect(() => {
    navigation.setOptions({ title: set?.name ?? 'Options' });
  }, [navigation, set?.name]);

  const shareList = useCallback(async () => {
    const s = getSet(setId);
    const opts = getOptions(setId);
    if (!s || opts.length === 0) {
      Alert.alert('Nothing to share', 'Add some options first.');
      return;
    }
    try {
      const lines = [
        `Fatevo list: ${s.name}`,
        ...opts.map((o) => `• ${o.name} (weight ${o.weight})`),
        `Can't pick? Fatevo.`,
      ];
      const file = new File(Paths.cache, 'fatevo-list.txt');
      file.write(lines.join('\n'));
      const uri = file.uri;
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'Your device cannot share files.');
        return;
      }
      await Sharing.shareAsync(uri, { dialogTitle: `Share "${s.name}"` });
    } catch (e: any) {
      Alert.alert('Could not share', e?.message ?? 'Something went wrong.');
    }
  }, [setId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={shareList} style={styles.shareButton}>
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, shareList]);

  const handleRoll = () => {
    try {
      const { winner, streak } = performRoll(setId);
      navigation.navigate('Result', {
        setId,
        winnerId: winner.id,
        streakCount: streak.streak,
        milestoneTitle: streak.milestone?.title ?? null,
        firstRollToday: streak.isFirstRollToday,
      });
    } catch (e: any) {
      Alert.alert('Hold on', e?.message ?? 'Something went wrong.');
    }
  };

  const toggleNoRepeat = (enabled: boolean) => {
    setNoRepeat(setId, enabled);
    reload();
  };

  const canRoll = options.length >= 2;

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleText}>
          <Text style={styles.toggleTitle}>No-repeat mode</Text>
          <Text style={styles.toggleSub}>
            {set?.noRepeat && remaining !== null
              ? `${remaining} still to win before the deck reshuffles`
              : 'Every option wins once before any repeats'}
          </Text>
        </View>
        <Switch
          value={set?.noRepeat ?? false}
          onValueChange={toggleNoRepeat}
          trackColor={{ true: colors.accent }}
        />
      </View>

      {options.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No options yet — add a few, then roll.</Text>
        </View>
      ) : (
        <FlatList
          data={options}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.sectionLabel}>Your options</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('OptionEdit', { setId, optionId: item.id })}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={styles.weightBadge}>
                <Text style={styles.weightText}>×{item.weight}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addOption}
          onPress={() => navigation.navigate('OptionEdit', { setId })}
        >
          <Text style={styles.addOptionText}>＋ Add option</Text>
        </TouchableOpacity>
        <View style={styles.rollWrap}>
          <TouchableOpacity
            style={[styles.roll, !canRoll && styles.rollDisabled]}
            onPress={handleRoll}
            disabled={!canRoll}
            accessibilityLabel="Roll the dice"
            activeOpacity={0.85}
          >
            <Text style={styles.rollDice}>🎲</Text>
            <Text style={styles.rollLabel}>ROLL</Text>
          </TouchableOpacity>
        </View>
        {!canRoll && (
          <Text style={styles.rollHint}>Add at least 2 options to roll.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleText: { flex: 1, paddingRight: spacing.sm },
  toggleTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  toggleSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  list: { padding: spacing.md, gap: spacing.sm },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 2,
  },
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
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, flex: 1 },
  weightBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  weightText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.muted, fontSize: 15 },
  footer: { padding: spacing.md, alignItems: 'center', gap: spacing.sm },
  addOption: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  addOptionText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  rollWrap: { alignItems: 'center', marginVertical: spacing.sm },
  roll: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#a8861d',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  rollDisabled: { opacity: 0.35 },
  rollDice: { fontSize: 54 },
  rollLabel: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 4,
  },
  rollHint: { textAlign: 'center', color: colors.muted, fontSize: 12 },
  shareButton: { paddingHorizontal: 8, paddingVertical: 6 },
  shareText: { color: colors.ink, fontSize: 16, fontWeight: '600' },
});
