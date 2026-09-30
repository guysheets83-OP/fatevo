import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import RecapShareCard from '../components/RecapShareCard';
import { getRollsInRange } from '../db';
import type { RootStackParamList } from '../navigation';
import { computeMonthStats, crownLine, monthBounds, type MonthStats } from '../recap';
import { colors, spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Recap'>;

const CONFETTI_EMOJI = ['🎉', '✨', '🎲', '⭐', '👑', '🎊'];
const CONFETTI_COUNT = 26;

interface ConfettiPiece {
  emoji: string;
  left: number;
  size: number;
  delay: number;
  duration: number;
  spin: number;
}

/** One-shot lightweight confetti burst — no extra dependencies. */
function Confetti() {
  const pieces = useRef<ConfettiPiece[]>(
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      emoji: CONFETTI_EMOJI[i % CONFETTI_EMOJI.length],
      left: Math.random() * 100,
      size: 16 + Math.random() * 18,
      delay: Math.random() * 600,
      duration: 1800 + Math.random() * 1400,
      spin: (Math.random() - 0.5) * 540,
    }))
  ).current;
  const anims = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const timers = pieces.map((p, i) =>
      setTimeout(() => {
        Animated.timing(anims[i], {
          toValue: 1,
          duration: p.duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start();
      }, p.delay)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => {
        const fall = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-60, 860],
        });
        const fade = anims[i].interpolate({
          inputRange: [0, 0.75, 1],
          outputRange: [1, 1, 0],
        });
        const rotate = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.spin}deg`],
        });
        return (
          <Animated.Text
            key={i}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              fontSize: p.size,
              opacity: fade,
              transform: [{ translateY: fall }, { rotate }],
            }}
          >
            {p.emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}

/** Screen — "Your Fatevo Month": top-3 decision categories with a celebration. */
export default function RecapScreen() {
  const navigation = useNavigation<Nav>();
  const [stats, setStats] = useState<MonthStats | null>(null);
  const shotRef = useRef<ViewShotRef>(null);
  const pop = useRef(new Animated.Value(0.7)).current;

  const reload = useCallback(() => {
    const now = new Date();
    const { start, end } = monthBounds(now.getFullYear(), now.getMonth());
    const rolls = getRollsInRange(start, end).map((r) => ({
      setName: r.setName,
      setEmoji: r.setEmoji,
      rolledAt: r.rolledAt,
    }));
    setStats(computeMonthStats(rolls, now.getFullYear(), now.getMonth()));
  }, []);

  useFocusEffect(reload);

  // Pop the card in once stats load.
  useEffect(() => {
    if (stats && stats.total > 0) {
      pop.setValue(0.7);
      Animated.spring(pop, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats?.total]);

  const shareAsImage = async () => {
    try {
      const uri = await shotRef.current?.capture?.();
      if (!uri) throw new Error('Could not capture the card.');
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'Your device cannot share files.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your month',
      });
    } catch (e: any) {
      Alert.alert('Could not share', e?.message ?? 'Something went wrong.');
    }
  };

  const top1 = stats?.top[0] ?? null;

  return (
    <View style={styles.container}>
      {stats && stats.total > 0 && <Confetti />}
      {/* Off-screen share card, captured with view-shot on Share. */}
      {stats && (
        <ViewShot
          ref={shotRef}
          options={{ format: 'png', quality: 1 }}
          style={styles.offscreen}
        >
          <View collapsable={false}>
            <RecapShareCard stats={stats} />
          </View>
        </ViewShot>
      )}

      <Text style={styles.kicker}>🎉 YOUR FATEVO MONTH</Text>
      <Text style={styles.monthTitle}>{stats?.monthLabel ?? '…'}</Text>

      {stats && stats.total > 0 && top1 ? (
        <Animated.View style={[styles.card, { transform: [{ scale: pop }] }]}>
          <Text style={styles.crown}>{crownLine(top1.name, stats.year, stats.month)}</Text>
          {stats.top.map((c, i) => (
            <View key={`${c.name}-${i}`} style={styles.row}>
              <View style={styles.rowHead}>
                <Text style={styles.rowEmoji}>{i === 0 ? '👑' : c.emoji}</Text>
                <Text style={styles.rowName} numberOfLines={1}>
                  {i === 0 ? `${c.emoji} ` : ''}
                  {c.name}
                </Text>
                <Text style={styles.rowPct}>{c.pct}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(4, c.pct)}%` }]} />
              </View>
            </View>
          ))}
          <Text style={styles.total}>
            {stats.total} {stats.total === 1 ? 'decision' : 'decisions'} left to fate
            this month
          </Text>
        </Animated.View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyEmoji}>🎲</Text>
          <Text style={styles.emptyTitle}>No fate sealed yet</Text>
          <Text style={styles.emptyText}>
            Roll the dice on any list and your month starts writing itself. Come
            back at the end of the month for the celebration.
          </Text>
        </View>
      )}

      <View style={styles.buttons}>
        {stats && stats.total > 0 && (
          <TouchableOpacity style={styles.shareBtn} onPress={shareAsImage}>
            <Text style={styles.shareText}>📤 Share my month</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back to lists</Text>
        </TouchableOpacity>
      </View>
      <LinearGradient
        colors={['transparent', '#00000033']}
        style={styles.fade}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    padding: spacing.lg,
  },
  offscreen: {
    position: 'absolute',
    left: -2000,
    top: 0,
  },
  kicker: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: spacing.md,
  },
  monthTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  card: {
    width: '100%',
    backgroundColor: '#23233f',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.accent,
    padding: spacing.lg,
  },
  crown: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '800',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  row: { marginBottom: spacing.md },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rowEmoji: { fontSize: 24, marginRight: spacing.sm },
  rowName: { flex: 1, color: '#fff', fontSize: 19, fontWeight: '800' },
  rowPct: { color: colors.accent, fontSize: 19, fontWeight: '900' },
  barTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff22',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  total: {
    color: '#b9a86a',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyEmoji: { fontSize: 52, textAlign: 'center' },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyText: {
    color: '#ffffffaa',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  buttons: { marginTop: spacing.lg, width: '80%', gap: spacing.sm },
  shareBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
  },
  shareText: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  backBtn: {
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff55',
  },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
});
