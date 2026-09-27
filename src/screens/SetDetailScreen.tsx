import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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
import { pickKnockout, pickNoRepeat, pickWinner } from '../roll';
import { computeRoll, todayLocal, type RollStreakResult } from '../streak';
import type { RootStackParamList } from '../navigation';
import { colors, spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SetDetail'>;
type Route = RouteProp<RootStackParamList, 'SetDetail'>;

export interface RollOutcome {
  winner: SetOption;
  streak: RollStreakResult;
}

export interface BestOfOutcome extends RollOutcome {
  /** Every roll winner in order (length N). */
  sequence: SetOption[];
}

/** Winner picking only: honors no-repeat mode and persists deck-draw state, no streak update. */
function pickWinnerOnly(setId: number): SetOption {
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
  return winner;
}

/** Record one daily-streak step and return the result. */
function recordStreakOnce(): RollStreakResult {
  // Daily streak: one roll per day counts; same-day repeats are idempotent.
  const { next, result } = computeRoll(getStreakState(), todayLocal());
  saveStreakState(next);
  return result;
}

/** Shared roll logic: honors no-repeat mode, persists deck-draw state, records the daily streak. */
export function performRoll(setId: number): RollOutcome {
  const winner = pickWinnerOnly(setId);
  return { winner, streak: recordStreakOnce() };
}

/**
 * Pure majority vote over a sequence of winner ids: most wins takes it,
 * ties broken by the most recent win (i.e. the last roll's winner when tied).
 */
export function majorityWinnerId(sequence: number[]): number {
  const counts = new Map<number, number>();
  for (const id of sequence) counts.set(id, (counts.get(id) ?? 0) + 1);
  let best = sequence[sequence.length - 1];
  let bestCount = -1;
  for (const id of sequence) {
    const c = counts.get(id) ?? 0;
    if (c >= bestCount) {
      bestCount = c;
      best = id;
    }
  }
  return best;
}

/**
 * Best-of-3: runs 3 independent weighted rolls in sequence. The option with
 * the most wins takes it (tiebreak: most recent win). The daily streak is
 * recorded exactly once, on the final result. Not offered in no-repeat mode.
 */
export function performBestOf(setId: number): BestOfOutcome {
  const set = getSet(setId);
  if (!set) throw new Error('List not found.');
  if (set.noRepeat) throw new Error('Best-of needs no-repeat mode off.');
  const sequence: SetOption[] = [];
  for (let i = 0; i < 3; i++) sequence.push(pickWinnerOnly(setId));
  const champId = majorityWinnerId(sequence.map((o) => o.id));
  const winner = sequence.find((o) => o.id === champId) ?? sequence[sequence.length - 1];
  return { winner, streak: recordStreakOnce(), sequence };
}

export interface EliminationOutcome extends RollOutcome {
  /** Every option id in elimination order — the champion is last. */
  knockoutOrder: number[];
}

/**
 * Elimination: for 5+ options. Each round knocks out one option — a weighted
 * draw with INVERTED weights over the remaining pool, so favorites survive
 * longer — until one champion remains. The daily streak is recorded exactly
 * once, on the champion. Manages its own shrinking pool, so it stays
 * available even when no-repeat mode is on.
 */
export function performElimination(setId: number): EliminationOutcome {
  const set = getSet(setId);
  if (!set) throw new Error('List not found.');
  let remaining = getOptions(setId);
  if (remaining.length < 5) throw new Error('Elimination needs at least 5 options.');
  const knockoutOrder: number[] = [];
  while (remaining.length > 1) {
    const out = pickKnockout(remaining);
    knockoutOrder.push(out.id);
    remaining = remaining.filter((o) => o.id !== out.id);
  }
  const champion = remaining[0];
  knockoutOrder.push(champion.id);
  return { winner: champion, streak: recordStreakOnce(), knockoutOrder };
}

/** Screen 2 — list detail: options, weights, no-repeat toggle, big ROLL. */
export default function SetDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { setId } = route.params;

  const [set, setSet] = useState<OptionSet | null>(null);
  const [options, setOptions] = useState<SetOption[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  /** Roll mode: Single always; Best of 3 for 2-4 options; Elimination for 5+. */
  const [rollMode, setRollMode] = useState<'single' | 'best3' | 'elimination'>('single');

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

  // Keep the selected mode valid as the option count / no-repeat changes:
  // best-of-3 only exists for 2-4 options with no-repeat off; elimination
  // only exists for 5+ options.
  useEffect(() => {
    if (
      rollMode === 'best3' &&
      (options.length < 2 || options.length > 4 || set?.noRepeat)
    ) {
      setRollMode('single');
    } else if (rollMode === 'elimination' && options.length < 5) {
      setRollMode('single');
    }
  }, [options.length, set?.noRepeat, rollMode]);

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
    const streakParams = (streak: RollStreakResult) => ({
      streakCount: streak.streak,
      milestoneTitle: streak.milestone?.title ?? null,
      firstRollToday: streak.isFirstRollToday,
    });
    try {
      if (rollMode === 'elimination') {
        const { winner, streak, knockoutOrder } = performElimination(setId);
        navigation.navigate('Result', {
          setId,
          winnerId: winner.id,
          knockoutOrder,
          ...streakParams(streak),
        });
      } else if (rollMode === 'best3') {
        const { winner, streak, sequence } = performBestOf(setId);
        navigation.navigate('Result', {
          setId,
          winnerId: winner.id,
          rollSequence: sequence.map((o) => o.id),
          bestOf: 3,
          ...streakParams(streak),
        });
      } else {
        const { winner, streak } = performRoll(setId);
        navigation.navigate('Result', {
          setId,
          winnerId: winner.id,
          ...streakParams(streak),
        });
      }
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
        <View style={styles.bestOfRow}>
          <TouchableOpacity
            style={[
              styles.bestOfPill,
              rollMode === 'single' && styles.bestOfPillActive,
              !canRoll && styles.bestOfPillDisabled,
            ]}
            onPress={() => setRollMode('single')}
            disabled={!canRoll}
            accessibilityLabel="Single roll"
          >
            <Text
              style={[styles.bestOfText, rollMode === 'single' && styles.bestOfTextActive]}
            >
              Single
            </Text>
          </TouchableOpacity>
          {options.length >= 2 && options.length <= 4 && (
            <TouchableOpacity
              style={[
                styles.bestOfPill,
                rollMode === 'best3' && styles.bestOfPillActive,
                (set?.noRepeat || !canRoll) && styles.bestOfPillDisabled,
              ]}
              onPress={() => setRollMode('best3')}
              disabled={set?.noRepeat || !canRoll}
              accessibilityLabel="Best of 3"
            >
              <Text
                style={[styles.bestOfText, rollMode === 'best3' && styles.bestOfTextActive]}
              >
                Best of 3
              </Text>
            </TouchableOpacity>
          )}
          {options.length >= 5 && (
            <TouchableOpacity
              style={[
                styles.bestOfPill,
                rollMode === 'elimination' && styles.bestOfPillActive,
                !canRoll && styles.bestOfPillDisabled,
              ]}
              onPress={() => setRollMode('elimination')}
              disabled={!canRoll}
              accessibilityLabel="Elimination mode"
            >
              <Text
                style={[
                  styles.bestOfText,
                  rollMode === 'elimination' && styles.bestOfTextActive,
                ]}
              >
                Elimination
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {set?.noRepeat && options.length < 5 ? (
          <Text style={styles.bestOfHint}>Best-of needs no-repeat mode off.</Text>
        ) : null}
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
  bestOfRow: { flexDirection: 'row', gap: spacing.sm },
  bestOfPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  bestOfPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  bestOfPillDisabled: { opacity: 0.4 },
  bestOfText: { fontSize: 14, fontWeight: '700', color: colors.muted },
  bestOfTextActive: { color: '#fff' },
  bestOfHint: { textAlign: 'center', color: colors.muted, fontSize: 12 },
  shareButton: { paddingHorizontal: 8, paddingVertical: 6 },
  shareText: { color: colors.ink, fontSize: 16, fontWeight: '600' },
});
