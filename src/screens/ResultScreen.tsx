import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getOption, getOptions, type SetOption } from '../db';
import type { RootStackParamList } from '../navigation';
import { colors, spacing } from '../theme';
import { performBestOf, performElimination, performRoll } from './SetDetailScreen';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Result'>;
type Route = RouteProp<RootStackParamList, 'Result'>;

const SHUFFLE_MS = 1500;
const WHEEL_MS = 2000;
const ROUND_BEAT_MS = 1100;
const WHEEL_SPINS = 4;

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

type AnimMode = 'coin' | 'slot' | 'wheel';

/** Wheel geometry (px). */
const WHEEL_SIZE = 300;
const WHEEL_C = WHEEL_SIZE / 2;
const WHEEL_R = 102;

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
  const [mode, setMode] = useState<AnimMode>('wheel');
  const [roundIdx, setRoundIdx] = useState(-1);
  const [roundBeat, setRoundBeat] = useState<{ index: number; name: string } | null>(null);
  const [champion, setChampion] = useState<{ name: string; detail: string } | null>(
    null
  );
  const [elimOrder, setElimOrder] = useState<number[] | null>(
    route.params.knockoutOrder ?? null
  );
  const [knockout, setKnockout] = useState<{ index: number; name: string } | null>(null);
  const [coinFace, setCoinFace] = useState('');
  const [reelNames, setReelNames] = useState<string[]>([]);
  const [slotIdx, setSlotIdx] = useState(0);
  const [streakInfo, setStreakInfo] = useState({
    streakCount: route.params.streakCount ?? 0,
    milestoneTitle: route.params.milestoneTitle ?? null,
    firstRollToday: route.params.firstRollToday ?? false,
  });
  const scale = useRef(new Animated.Value(0.6)).current;
  const milestoneScale = useRef(new Animated.Value(0.6)).current;
  const flipX = useRef(new Animated.Value(1)).current;
  const wheelRot = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /**
   * Full spectacle animation for the current option count, then calls onLanded.
   * coin (2 options) and slot (3) use the slowing tick chain; the wheel (4+)
   * spins with a decelerating ease and lands the winner's segment under the
   * gold pointer. The winner is predetermined by the roll logic — the
   * animation just lands on it.
   *
   * `pool` restricts the wheel/disc to a subset of the list's options
   * (elimination rounds); `modeOverride` forces the wheel even for small
   * pools, so every elimination round spins the full wheel.
   */
  const playAnimation = useCallback(
    (id: number, onLanded: () => void, pool?: SetOption[], modeOverride?: AnimMode) => {
      clearTimers();
      wheelRot.stopAnimation();
      const options = pool ?? getOptions(setId);
      const names = options.map((o) => o.name);
      const winner = getOption(id);
      if (!winner || names.length === 0) {
        navigation.goBack();
        return;
      }
      const m: AnimMode =
        modeOverride ?? (names.length <= 2 ? 'coin' : names.length === 3 ? 'slot' : 'wheel');
      setMode(m);
      setReelNames(names);
      setSlotIdx(0);
      setCoinFace(names[0]);
      flipX.setValue(1);
      wheelRot.setValue(0);
      const done = () => {
        if (alive.current) onLanded();
      };
      if (m === 'wheel') {
        const n = names.length;
        const seg = 360 / n;
        const wIdx = Math.max(
          0,
          options.findIndex((o) => o.id === id)
        );
        // Winner pill sits at wIdx * seg degrees clockwise from the top;
        // rotate the disc so it ends under the pointer, plus full spins.
        const landing = (360 - ((wIdx * seg) % 360)) % 360;
        const total = 360 * WHEEL_SPINS + landing;
        Animated.timing(wheelRot, {
          toValue: total,
          duration: WHEEL_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) done();
        });
        return;
      }
      // coin / slot: animate with ticks that slow toward the end.
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        if (elapsed >= SHUFFLE_MS) {
          done();
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
        } else {
          setSlotIdx((i) => i + 1 + Math.floor(Math.random() * 2));
        }
        timers.current.push(setTimeout(tick, tickMs));
      };
      tick();
    },
    [setId, navigation, flipX, wheelRot]
  );

  /** Single roll: full animation, then the winner card reveal. */
  const runSingleReveal = useCallback(
    (id: number) => {
      setRoundIdx(-1);
      setRoundBeat(null);
      setChampion(null);
      setElimOrder(null);
      setKnockout(null);
      setRevealed(false);
      setPhrase(randomPhrase());
      scale.setValue(0.6);
      playAnimation(id, () => {
        const opt = getOption(id);
        setDisplayName(opt?.name ?? '…');
        setRevealed(true);
        Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
      });
    },
    [playAnimation, scale]
  );

  /**
   * Best-of mode: every round plays the FULL animation, then a brief
   * "Round X winner" beat, then the next round. After all rounds, the
   * champion reveal — plurality winner (most round wins), tiebreak already
   * resolved by majorityWinnerId in performBestOf.
   */
  const playRounds = useCallback(
    (ids: number[], championId: number) => {
      setRevealed(false);
      setChampion(null);
      setRoundBeat(null);
      setElimOrder(null);
      setKnockout(null);
      setPhrase(randomPhrase());
      let i = 0;
      const next = () => {
        if (!alive.current) return;
        if (i >= ids.length) {
          const champ = getOption(championId);
          const wins = ids.filter((x) => x === championId).length;
          setChampion({
            name: champ?.name ?? '…',
            detail: `${wins} of ${ids.length} rounds`,
          });
          setRoundIdx(-1);
          setRevealed(true);
          scale.setValue(0.6);
          Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
          return;
        }
        const roundId = ids[i];
        const idx = i;
        setRoundIdx(idx);
        playAnimation(roundId, () => {
          const opt = getOption(roundId);
          setRoundBeat({ index: idx, name: opt?.name ?? '…' });
          timers.current.push(
            setTimeout(() => {
              if (!alive.current) return;
              setRoundBeat(null);
              i += 1;
              next();
            }, ROUND_BEAT_MS)
          );
        });
      };
      next();
    },
    [playAnimation, scale]
  );

  /**
   * Elimination mode (5+ options): every round spins the full wheel and
   * knocks one option OUT — the wheel lands on the eliminated option, a
   * brief "❌ <name> is out!" beat shows, and it leaves the wheel. When one
   * option remains, the champion reveal ("Last one standing"). The knockout
   * order is predetermined by performElimination — the animation just
   * plays it out.
   */
  const playElimination = useCallback(
    (order: number[], championId: number) => {
      setRevealed(false);
      setChampion(null);
      setRoundBeat(null);
      setKnockout(null);
      setSeq(null);
      setPhrase(randomPhrase());
      let pool = getOptions(setId);
      let i = 0;
      const next = () => {
        if (!alive.current) return;
        if (i >= order.length - 1) {
          const champ = getOption(championId);
          setChampion({ name: champ?.name ?? '…', detail: 'Last one standing' });
          setRoundIdx(-1);
          setRevealed(true);
          scale.setValue(0.6);
          Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
          return;
        }
        const outId = order[i];
        const idx = i;
        setRoundIdx(idx);
        playAnimation(
          outId,
          () => {
            const opt = getOption(outId);
            setKnockout({ index: idx, name: opt?.name ?? '…' });
            timers.current.push(
              setTimeout(() => {
                if (!alive.current) return;
                setKnockout(null);
                pool = pool.filter((o) => o.id !== outId);
                i += 1;
                next();
              }, ROUND_BEAT_MS)
            );
          },
          pool,
          'wheel'
        );
      };
      next();
    },
    [playAnimation, scale, setId]
  );

  useEffect(() => {
    alive.current = true;
    const ko = route.params.knockoutOrder;
    const ids = route.params.rollSequence;
    if (ko && ko.length > 1) {
      setElimOrder(ko);
      playElimination(ko, route.params.winnerId);
    } else if (ids && ids.length > 1) {
      playRounds(ids, route.params.winnerId);
    } else {
      runSingleReveal(route.params.winnerId);
    }
    return () => {
      alive.current = false;
      clearTimers();
    };
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
      if (elimOrder) {
        const { winner, streak, knockoutOrder } = performElimination(setId);
        setWinnerId(winner.id);
        setElimOrder(knockoutOrder);
        setSeq(null);
        setStreakInfo({
          streakCount: streak.streak,
          milestoneTitle: streak.milestone?.title ?? null,
          firstRollToday: streak.isFirstRollToday,
        });
        playElimination(knockoutOrder, winner.id);
      } else if (bestOfMode > 1) {
        const { winner, streak, sequence } = performBestOf(setId);
        const ids = sequence.map((o) => o.id);
        setWinnerId(winner.id);
        setSeq(ids);
        setElimOrder(null);
        setStreakInfo({
          streakCount: streak.streak,
          milestoneTitle: streak.milestone?.title ?? null,
          firstRollToday: streak.isFirstRollToday,
        });
        playRounds(ids, winner.id);
      } else {
        const { winner, streak } = performRoll(setId);
        setWinnerId(winner.id);
        setSeq(null);
        setElimOrder(null);
        setStreakInfo({
          streakCount: streak.streak,
          milestoneTitle: streak.milestone?.title ?? null,
          firstRollToday: streak.isFirstRollToday,
        });
        runSingleReveal(winner.id);
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
    ? champion
      ? '🏆 Champion crowned'
      : `🎲 ${phrase}`
    : elimOrder
      ? roundIdx < 0
        ? '🎡 Spinning up…'
        : `🎡 Round ${roundIdx + 1} — ${elimOrder.length - roundIdx} remain…`
      : roundBeat || roundIdx >= 0
        ? `🎲 Round ${(roundBeat?.index ?? roundIdx) + 1} of ${seq?.length ?? '?'}…`
        : '🎲 Rolling…';

  const wheelSpin = wheelRot.interpolate({
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

  // Shrink the wheel pills when there are many options so they don't overlap.
  const pillW =
    n > 0 ? Math.min(84, Math.max(46, Math.floor((2 * Math.PI * WHEEL_R) / n) - 8)) : 84;

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>{kickerText}</Text>

      {!revealed && roundBeat && (
        <View style={[styles.winnerCard, styles.miniCard]}>
          <Text style={styles.miniLabel}>Round {roundBeat.index + 1} winner</Text>
          <Text style={styles.winner} numberOfLines={3}>
            {roundBeat.name}
          </Text>
        </View>
      )}

      {!revealed && knockout && (
        <View style={[styles.winnerCard, styles.miniCard]}>
          <Text style={styles.miniLabel}>Round {knockout.index + 1}</Text>
          <Text style={styles.winner} numberOfLines={3}>
            ❌ {knockout.name} is out!
          </Text>
        </View>
      )}

      {!revealed && !roundBeat && (
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
          {mode === 'wheel' && (
            <View style={styles.wheelWrap}>
              <Text style={styles.pointer}>▼</Text>
              <View style={styles.wheelBox}>
                <Animated.View style={[styles.wheel, { transform: [{ rotate: wheelSpin }] }]}>
                  {reelNames.map((name, i) => {
                    const a = (i * 2 * Math.PI) / reelNames.length;
                    const x = WHEEL_C + WHEEL_R * Math.sin(a);
                    const y = WHEEL_C - WHEEL_R * Math.cos(a);
                    return (
                      <View
                        key={`${i}-${name}`}
                        style={[styles.pillAnchor, { left: x, top: y }]}
                      >
                        <View
                          style={[
                            styles.pill,
                            { width: pillW, marginLeft: -pillW / 2 },
                            i % 2 === 0 && styles.pillAlt,
                          ]}
                        >
                          <Text style={styles.pillText} numberOfLines={1}>
                            {name}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </Animated.View>
                <View style={styles.hub}>
                  <Text style={styles.hubText}>🎲</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {revealed && (
        <Animated.View style={[styles.winnerCard, { transform: [{ scale }] }]}>
          {champion && <Text style={styles.miniLabel}>🏆 Champion</Text>}
          <Text style={styles.winner} numberOfLines={3}>
            {champion ? champion.name : displayName}
          </Text>
          {champion && (
            <Text style={styles.champSub}>{champion.detail}</Text>
          )}
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
    minHeight: 380,
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
  wheelWrap: { alignItems: 'center' },
  pointer: { color: colors.accent, fontSize: 36, marginBottom: -12, zIndex: 2 },
  wheelBox: { width: WHEEL_SIZE, height: WHEEL_SIZE },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: '#23233f',
    borderWidth: 5,
    borderColor: colors.accent,
  },
  pillAnchor: { position: 'absolute', width: 0, height: 0 },
  pill: {
    height: 32,
    marginTop: -16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  pillAlt: { backgroundColor: colors.accent },
  pillText: { fontSize: 12, fontWeight: '800', color: colors.ink },
  hub: {
    position: 'absolute',
    left: WHEEL_C - 32,
    top: WHEEL_C - 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: '#a8861d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubText: { fontSize: 30 },
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
  champSub: { color: colors.muted, fontSize: 15, fontWeight: '700', marginTop: spacing.xs },
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
