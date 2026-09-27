import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { colors, spacing } from '../theme';

interface Section {
  emoji: string;
  title: string;
  body: string;
}

const SECTIONS: Section[] = [
  {
    emoji: '📝',
    title: 'Making lists',
    body: 'Tap ＋ to create a list, add your options, and pick an emoji for it.',
  },
  {
    emoji: '⚖️',
    title: 'Weights 1–5',
    body: 'Weight your favorites up to ×5 — a higher weight means that option is picked more often.',
  },
  {
    emoji: '🎲',
    title: 'Roll animations',
    body: '2 options = patriotic coin flip · 3 options = slot machine · 4 or more = prize wheel.',
  },
  {
    emoji: '🔁',
    title: 'Roll modes',
    body: 'Lists of 2–4 options roll Single or Best of 3. With 5 or more options, pick Single or Elimination.',
  },
  {
    emoji: '⚡',
    title: 'Sudden death',
    body: 'If Best of 3 ends in a tie, the tied options spin off — winner takes all.',
  },
  {
    emoji: '🏆',
    title: 'Elimination',
    body: 'Every wheel spin knocks one option out until only the champion remains.',
  },
  {
    emoji: '🚫',
    title: 'No-repeat mode',
    body: 'Winners sit out until every option has won once, then the deck reshuffles.',
  },
  {
    emoji: '🔥',
    title: 'Daily streak',
    body: 'Roll at least once a day to keep the flame alive. Milestones at 7, 30, and 100 days.',
  },
  {
    emoji: '📤',
    title: 'Sharing',
    body: 'Share any result as text or as an image card — it includes the list title, the winner, and the options.',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Re-openable "How Fatevo works" reference sheet. Tapping the ⓘ button in
 * the Lists header shows it; tap outside or Done to dismiss.
 */
export default function HowItWorks({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel="Close help"
      >
        <TouchableWithoutFeedback>
          <View style={styles.sheet}>
            <Text style={styles.title}>How Fatevo works</Text>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {SECTIONS.map((s) => (
                <View key={s.title} style={styles.section}>
                  <Text style={styles.sectionEmoji}>{s.emoji}</Text>
                  <View style={styles.sectionBody}>
                    <Text style={styles.sectionTitle}>{s.title}</Text>
                    <Text style={styles.sectionText}>{s.body}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={onClose}
              accessibilityLabel="Close help"
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,46,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: spacing.sm },
  section: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionEmoji: { fontSize: 26, marginRight: spacing.sm, marginTop: 2 },
  sectionBody: { flex: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  sectionText: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  doneButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  doneText: { color: colors.ink, fontSize: 17, fontWeight: '800' },
});
