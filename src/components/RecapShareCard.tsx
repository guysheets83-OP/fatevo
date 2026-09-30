import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { crownLine, type MonthStats } from '../recap';
import { colors } from '../theme';

export const RECAP_CARD_WIDTH = 512;
export const RECAP_CARD_HEIGHT = 680;

type Props = {
  stats: MonthStats;
};

/**
 * ESPN/Spotify-style shareable monthly recap card. Fixed portrait size,
 * rendered off-screen and captured with react-native-view-shot.
 */
export default function RecapShareCard({ stats }: Props) {
  const top1 = stats.top[0] ?? null;
  return (
    <View style={styles.card} collapsable={false}>
      <LinearGradient
        colors={['#262644', colors.primary]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.brandRow}>
        <View style={styles.dieCircle}>
          <Text style={styles.die}>🎲</Text>
        </View>
        <Text style={styles.wordmark}>Fatevo</Text>
      </View>

      <Text style={styles.kicker}>🎉 YOUR FATEVO MONTH</Text>
      <Text
        style={styles.monthTitle}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {stats.shareTitle}
      </Text>

      <View style={styles.middle}>
        {top1 ? (
          <>
            <Text style={styles.crown} numberOfLines={2} adjustsFontSizeToFit>
              {crownLine(top1.name, stats.year, stats.month)}
            </Text>
            {stats.top.map((c, i) => (
              <View key={`${c.name}-${i}`} style={styles.row}>
                <View style={styles.rowHead}>
                  <Text style={styles.rowEmoji}>{i === 0 ? '👑' : c.emoji}</Text>
                  <Text
                    style={styles.rowName}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {i === 0 ? c.emoji + ' ' : ''}
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
            </Text>
          </>
        ) : (
          <Text style={styles.emptyCard}>
            No fate sealed yet — roll the dice and your month starts writing itself.
          </Text>
        )}
      </View>

      <Text style={styles.tagline}>{"Can't pick? Fatevo."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: RECAP_CARD_WIDTH,
    height: RECAP_CARD_HEIGHT,
    paddingHorizontal: 44,
    paddingVertical: 40,
    backgroundColor: colors.primary,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dieCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  die: {
    fontSize: 30,
  },
  wordmark: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '800',
  },
  kicker: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 5,
    textAlign: 'center',
    marginTop: 14,
  },
  monthTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 8,
  },
  middle: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  crown: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '800',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 18,
  },
  row: {
    marginBottom: 16,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rowEmoji: {
    fontSize: 26,
    marginRight: 10,
  },
  rowName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
  },
  rowPct: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '900',
  },
  barTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff22',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: colors.accent,
  },
  total: {
    color: '#b9a86a',
    fontSize: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  emptyCard: {
    color: '#ffffffcc',
    fontSize: 24,
    lineHeight: 34,
    textAlign: 'center',
  },
  tagline: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
});
