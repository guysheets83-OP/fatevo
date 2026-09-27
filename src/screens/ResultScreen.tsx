import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getOption, getOptions } from '../db';
import type { RootStackParamList } from '../navigation';
import { colors, spacing } from '../theme';
import { performRoll } from './SetDetailScreen';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Result'>;
type Route = RouteProp<RootStackParamList, 'Result'>;

const SHUFFLE_MS = 1500;

const FATE_PHRASES = [
  'Fate has spoken',
  'The dice have decided',
  'Destiny calls',
  'It is written',
  'The stars align',
  'No take-backs!',
  'Fortune favors this one',
  'The universe chooses',
  'Decided. Done.',
  'Your fate is sealed',
];

function randomPhrase(): string {
  return FATE_PHRASES[Math.floor(Math.random() * FATE_PHRASES.length)];
}

/** Screen 4 — animated winner reveal. */
export default function ResultScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { setId } = route.params;

  const [winnerId, setWinnerId] = useState(route.params.winnerId);
  const [displayName, setDisplayName] = useState('…');
  const [revealed, setRevealed] = useState(false);
  const [phrase, setPhrase] = useState(FATE_PHRASES[0]);
  const [streakInfo, setStreakInfo] = useState({
    streakCount: route.params.streakCount ?? 0,
    milestoneTitle: route.params.milestoneTitle ?? null,
    firstRollToday: route.params.firstRollToday ?? false,
  });
  const scale = useRef(new Animated.Value(0.6)).current;
  const milestoneScale = useRef(new Animated.Value(0.6)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const runReveal = useCallback(
    (id: number) => {
      clearTimers();
      setRevealed(false);
      setPhrase(randomPhrase());
      scale.setValue(0.6);
      const options = getOptions(setId);
      const names = options.map((o) => o.name);
      const winner = getOption(id);
      if (!winner || names.length === 0) {
        navigation.goBack();
        return;
      }
      // Shuffle phase: flash random names, slowing toward the end.
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        if (elapsed >= SHUFFLE_MS) {
          setDisplayName(winner.name);
          setRevealed(true);
          Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
          return;
        }
        const progress = elapsed / SHUFFLE_MS;
        setDisplayName(names[Math.floor(Math.random() * names.length)]);
        timers.current.push(setTimeout(tick, 60 + progress * 160));
      };
      tick();
    },
    [setId, navigation, scale]
  );

  useEffect(() => {
    runReveal(winnerId);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Milestone celebration: spring in a gold card, same style as the winner reveal.
  useEffect(() => {
    if (revealed && streakInfo.milestoneTitle) {
      milestoneScale.setValue(0.6);
      Animated.spring(milestoneScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [revealed, streakInfo.milestoneTitle, milestoneScale]);

  const rollAgain = () => {
    try {
      const { winner, streak } = performRoll(setId);
      setWinnerId(winner.id);
      setStreakInfo({
        streakCount: streak.streak,
        milestoneTitle: streak.milestone?.title ?? null,
        firstRollToday: streak.isFirstRollToday,
      });
      runReveal(winner.id);
    } catch {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>{revealed ? `🎲 ${phrase}` : '🎲 Rolling…'}</Text>
      <Animated.View style={[styles.winnerCard, { transform: [{ scale }] }]}>
        <Text style={styles.winner} numberOfLines={3}>
          {displayName}
        </Text>
      </Animated.View>
      {revealed && streakInfo.milestoneTitle && (
        <Animated.View
          style={[styles.milestoneCard, { transform: [{ scale: milestoneScale }] }]}
        >
          <Text style={styles.milestoneKicker}>🏆 Milestone reached</Text>
          <Text style={styles.milestoneTitle}>{streakInfo.milestoneTitle}</Text>
          <Text style={styles.milestoneSub}>
            {streakInfo.streakCount}-day streak — fate favors the persistent
          </Text>
        </Animated.View>
      )}
      {revealed && !streakInfo.milestoneTitle && streakInfo.streakCount > 0 && (
        <Text style={styles.streakNote}>
          {streakInfo.firstRollToday
            ? `Streak saved! 🔥 ${streakInfo.streakCount}-day streak`
            : `🔥 ${streakInfo.streakCount}-day streak`}
        </Text>
      )}
      {revealed && (
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.rollAgain} onPress={rollAgain}>
            <Text style={styles.rollAgainText}>Roll again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back to list</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  kicker: { color: colors.accent, fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  winnerCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    minWidth: '80%',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  winner: { fontSize: 34, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  milestoneCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    minWidth: '80%',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  milestoneKicker: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  milestoneTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  milestoneSub: { color: colors.muted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  streakNote: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.md },
  buttons: { marginTop: spacing.lg, width: '80%', gap: spacing.sm },
  rollAgain: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
  },
  rollAgainText: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  back: {
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff55',
  },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
