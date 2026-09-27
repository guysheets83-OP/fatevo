import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../theme';

interface Step {
  emoji: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    emoji: '📝',
    title: 'Create a list',
    body: 'Tap ＋ to start a decision list — dinner spots, movies, chores, anything you can’t decide on.',
  },
  {
    emoji: '⚖️',
    title: 'Add your options',
    body: 'Add your choices and weight your favorites ×1 to ×5. A higher weight means better odds of winning.',
  },
  {
    emoji: '🎲',
    title: 'Roll the dice',
    body: 'Hit the big gold ROLL button and let fate decide. Roll every day to build your streak!',
  },
];

interface Props {
  visible: boolean;
  onDone: () => void;
}

/** First-launch 3-step walkthrough. Shown once; completion/skip is persisted by the parent. */
export default function Tutorial({ visible, onDone }: Props) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDone}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.skip} onPress={onDone} accessibilityLabel="Skip tutorial">
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>
        </View>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.navButton, step === 0 && styles.navHidden]}
            disabled={step === 0}
            onPress={() => setStep((s) => Math.max(0, s - 1))}
          >
            <Text style={styles.navText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => (last ? onDone() : setStep((s) => s + 1))}
          >
            <Text style={styles.nextText}>{last ? 'Start rolling 🎲' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  skip: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  skipText: { color: '#ffffff88', fontSize: 16, fontWeight: '600' },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  emoji: { fontSize: 84, marginBottom: spacing.lg },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 17,
    color: '#ffffffdd',
    textAlign: 'center',
    lineHeight: 26,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff33',
  },
  dotActive: { backgroundColor: colors.accent },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: { padding: spacing.sm },
  navHidden: { opacity: 0 },
  navText: { color: '#ffffffaa', fontSize: 16, fontWeight: '600' },
  nextButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  nextText: { color: colors.ink, fontSize: 17, fontWeight: '800' },
});
