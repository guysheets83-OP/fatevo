import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getOption, getOptions } from '../db';
import type { RootStackParamList } from '../navigation';
import { colors, spacing } from '../theme';
import { performBestOf, performRoll } from './SetDetailScreen';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Result'>;
type Route = RouteProp<RootStackParamList, 'Result'>;

const SHUFFLE_MS = 1500;
const MINI_MS = 600;

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

type AnimMode = 'coin' | 'slot' | 'dice';

const PIPS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function randomPip(): string {
  return PIPS[Math.floor(Math.random() * PIPS.length)];
}

/** Screen 4 — animated winner reveal. */
export default function ResultScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { setId } = route.params;
  const bestOfMode = route.params.bestOf ?? 1;

  const [winnerId, setWinnerId] = useState(route.params.winnerId);
  const [seq, setSeq] = useState<number[] | null>(route.params.rollSequence ?? null);
  const [displayName, setDisplayName] = useState('…');
  const [revealed, setRevealed] = useState(false);
  const [phrase, setPhrase] = useState(FATE_PHRASES[0]);
  const [mode, setMode] = useState<AnimMode>('dice');
  const [miniIndex, setMiniIndex] = useState(-1);
  const [miniName, setMiniName] = useState('');
  const [coinFace, setCoinFace] = useState('');
  const [reelNames, setReelNames] = useState<string[]>([]);
  const [slotIdx, setSlotIdx] = useState(0);
  const [pip, setPip] = useState('⚄');
  const [streakInfo, setStreakInfo] = useState({
    streakCount: route.params.streakCount ?? 0,
    milestoneTitle: route.params.milestoneTitle ?? null,
    firstRollToday: route.params.firstRollToday ?? false,
  });
  const scale = useRef(new Animated.Value(0.6)).current;
  const miniPop = useRef(new Animated.Value(0.7)).current;
  const milestoneScale = useRef(new Animated.Value(0.6)).current;
  const flipX = useRef(new Animated.Value(1)).current;
  const diceRot = useRef(new Animated.Value(0)).current;
  const rotDeg = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /** Full spectacle reveal: coin flip (2 options), slot machine (3), tumbling dice (4+). */
  const runFinalReveal = useCallback(
    (id: number) => {
      clearTimers();
      setMiniIndex(-1);
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
      const m: AnimMode = names.length <= 2 ? 'coin' : names.length === 3 ? 'slot' : 'dice';
      setMode(m);
      setReelNames(names);
      setSlotIdx(0);
      setCoinFace(names[0]);
      setPip(randomPip());
      rotDeg.current = 0;
      diceRot.setValue(0);
      flipX.setValue(1);
      // Shuffle phase: animate, slowing toward the end.
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
        const tickMs = 60 + progress * 160;
        if (m === 'coin') {
          setCoinFace((prev) => (prev === names[0] ? names[1] : names[0]));
          flipX.setValue(1);
          Animated.timing(flipX, {
            toValue: -1,
            duration: Math.max(40, tickMs * 0.85),
            useNativeDriver: true,
          }).start();
        } else if (m === 'slot') {
          setSlotIdx((i) => i + 1 + Math.floor(Math.random() * 2));
        } else {
          setPip(randomPip());
          const from = rotDeg.current % 360;
          const to = from + 120 + Math.floor(Math.random() * 120);
          rotDeg.current = to;
          diceRot.setValue(from);
          Animated.timing(diceRot, {
            toValue: to,
            duration: Math.max(50, tickMs * 0.9),
            useNativeDriver: true,
          }).start();
        }
        timers.current.push(setTimeout(tick, tickMs));
      };
      tick();
    },
    [setId, navigation, scale, flipX, diceRot]
  );

  /** Best-of mode: quick 600ms mini-reveals for every roll, then the champion reveal. */
  const playMinis = useCallback(
    (ids: number[], finalId: number) => {
      clearTimers();
      setRevealed(false);
      setMiniIndex(-1);
      let i = 0;
      const step = () => {
        if (i >= ids.length) {
          runFinalReveal(finalId);
          return;
        }
        const opt = getOption(ids[i]);
        setMiniName(opt ? opt.name : '…');
        setMiniIndex(i);
        miniPop.setValue(0.7);
        Animated.spring(miniPop, { toValue: 1, friction: 6, useNativeDriver: true }).start();
        i += 1;
        timers.current.push(setTimeout(step, MINI_MS));
      };
      step();
    },
    [runFinalReveal, miniPop]
  );

  useEffect(() => {
    const ids = route.params.rollSequence;
    if (ids && ids.length > 1) {
      playMinis(ids, route.params.winnerId);
    } else {
      runFinalReveal(route.params.winnerId);
    }
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
      if (bestOfMode > 1) {
        const { winner, streak, sequence } = performBestOf(setId, bestOfMode === 5 ? 5 : 3);
        const ids = sequence.map((o) => o.id);
        setWinnerId(winner.id);
        setSeq(ids);
        setStreakInfo({
          streakCount: streak.streak,
          milestoneTitle: streak.milestone?.title ?? null,
          firstRollToday: streak.isFirstRollToday,
        });
        playMinis(ids, winner.id);
      } else {
        const { winner, streak } = performRoll(setId);
        setWinnerId(winner.id);
        setSeq(null);
        setStreakInfo({
          streakCount: streak.streak,
          milestoneTitle: streak.milestone?.title ?? null,
          firstRollToday: streak.isFirstRollToday,
        });
        runFinalReveal(winner.id);
      }
    } catch {
      navigation.goBack();
    }
  };

  const shareResult = () => {
    const opt = getOption(winnerId);
    const name = opt?.name ?? displayName;
    const options = getOptions(setId)
      .map((o) => o.name)
      .join(', ');
    Share.share({
      message: `🎲 Fate chose ${name.toUpperCase()}!\nThe options were: ${options}\nCan't pick? Fatevo.`,
    }).catch(() => {});
  };

  const kickerText = revealed
    ? `🎲 ${phrase}`
    : miniIndex >= 0 && seq
      ? `🎲 Roll ${miniIndex + 1} of ${seq.length}…`
      : '🎲 Rolling…';

  const diceSpin = diceRot.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const n = reelNames.length;
  const slotRows =
    n > 0
      ? [
          reelNames[((slotIdx - 1) % n + n) % n],
          reelNames[slotIdx % n],
          reelNames[(slotIdx + 1) % n],
        ]
      : ['…', '…', '…'];

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>{kickerText}</Text>

      {!revealed && miniIndex >= 0 && (
        <Animated.View
          style={[styles.winnerCard, styles.miniCard, { transform: [{ scale: miniPop }] }]}
        >
          <Text style={styles.miniLabel}>
            Roll {miniIndex + 1} of {seq?.length ?? '?'}
          </Text>
          <Text style={styles.winner} numberOfLines={3}>
            {miniName}
          </Text>
        </Animated.View>
      )}

      {!revealed && miniIndex < 0 && (
        <View style={styles.stage}>
          {mode === 'coin' && (
            <Animated.View style={[styles.coin, { transform: [{ scaleX: flipX }] }]}>
              <Text style={styles.coinFace} numberOfLines={2}>
                {coinFace}
              </Text>
            </Animated.View>
          )}
          {mode === 'slot' && (
            <View style={styles.slotFrame}>
              <Text style={styles.slotRowDim} numberOfLines={1}>
                {slotRows[0]}
              </Text>
              <View style={styles.slotWindow}>
                <Text style={styles.slotRowMain} numberOfLines={1}>
                  {slotRows[1]}
                </Text>
              </View>
              <Text style={styles.slotRowDim} numberOfLines={1}>
                {slotRows[2]}
              </Text>
            </View>
          )}
          {mode === 'dice' && (
            <Animated.View style={[styles.dice, { transform: [{ rotate: diceSpin }] }]}>
              <Text style={styles.pip}>{pip}</Text>
            </Animated.View>
          )}
        </View>
      )}

      {revealed && (
        <Animated.View style={[styles.winnerCard, { transform: [{ scale }] }]}>
          <Text style={styles.winner} numberOfLines={3}>
            {displayName}
          </Text>
        </Animated.View>
      )}

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
          <View style={styles.rowButtons}>
            <TouchableOpacity style={styles.halfBtn} onPress={shareResult}>
              <Text style={styles.halfText}>📤 Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.halfBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.halfText}>Back to list</Text>
            </TouchableOpacity>
          </View>
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
  stage: {
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coin: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: colors.accent,
    borderWidth: 5,
    borderColor: '#a8861d',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  coinFace: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  slotFrame: {
    backgroundColor: '#101020',
    borderRadius: 18,
    borderWidth: 4,
    borderColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minWidth: '80%',
    alignItems: 'center',
  },
  slotRowDim: { color: '#ffffff55', fontSize: 20, fontWeight: '700', marginVertical: 4 },
  slotWindow: {
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.accent,
    paddingVertical: spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  slotRowMain: { color: '#fff', fontSize: 26, fontWeight: '800' },
  dice: {
    width: 150,
    height: 150,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pip: { fontSize: 84, color: colors.ink },
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
  miniCard: { minWidth: '80%' },
  miniLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
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
  rowButtons: { flexDirection: 'row', gap: spacing.sm },
  halfBtn: {
    flex: 1,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff55',
  },
  halfText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
