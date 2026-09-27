import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export const SHARE_CARD_WIDTH = 512;
export const SHARE_CARD_HEIGHT = 680;

type Props = {
  winnerName: string;
  options: string[];
  phrase: string;
  category: string;
};

/**
 * ESPN/Spotify-style shareable result card. Fixed portrait size, rendered
 * off-screen and captured with react-native-view-shot when the user picks
 * "Share image card".
 */
export default function ShareCard({ winnerName, options, phrase, category }: Props) {
  const shown = options.length > 10 ? options.slice(0, 10) : options;
  const more = options.length - shown.length;
  const optionsText =
    shown.join('  •  ') + (more > 0 ? `  •  +${more} more` : '');
  const many = options.length > 6;

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

      <Text style={styles.phrase}>{phrase}</Text>

      <Text
        style={styles.category}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {category}
      </Text>

      <View style={styles.middle}>
        <Text style={styles.kicker}>FATE CHOSE</Text>
        <Text
          style={styles.winner}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {winnerName}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.optionsLabel}>The options were:</Text>
        <Text style={[styles.options, many && styles.optionsMany]}>
          {optionsText}
        </Text>
      </View>

      <Text style={styles.tagline}>{"Can't pick? Fatevo."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
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
  phrase: {
    color: colors.accent,
    fontSize: 21,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  // The category being decided, e.g. "🎶 Who chooses the music".
  category: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 12,
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 6,
  },
  winner: {
    color: '#ffffff',
    fontSize: 68,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
  },
  divider: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginVertical: 26,
  },
  optionsLabel: {
    color: '#b9a86a',
    fontSize: 22,
    marginBottom: 10,
  },
  options: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 38,
    textAlign: 'center',
  },
  optionsMany: {
    fontSize: 20,
    lineHeight: 32,
  },
  tagline: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
});
