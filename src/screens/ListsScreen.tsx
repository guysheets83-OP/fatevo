import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import NamePrompt from '../components/NamePrompt';
import HowItWorks from '../components/HowItWorks';
import Tutorial from '../components/Tutorial';
import {
  createSet,
  deleteSet,
  getMeta,
  getSetSummaries,
  getStreakState,
  renameSet,
  setMeta,
} from '../db';
import type { RootStackParamList } from '../navigation';
import { MILESTONES, titleForStreak } from '../streak';
import { colors, spacing } from '../theme';
import type { SetSummary } from '../db';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Lists'>;

const TUTORIAL_KEY = 'tutorial_seen';

const FATE_TIPS = [
  'Give favorites better odds — set a weight up to ×5 on the options you secretly hope win.',
  'No-repeat mode deals every option once before reshuffling — perfect for chores.',
  'Long-press any list to rename or delete it.',
  'Roll once a day to grow your streak — miss a day and it resets to zero!',
  'Share a list with friends, so everyone argues with fate instead of you.',
  'Stuck between two? Fewer options means faster fate.',
  'Milestones await: 7 days makes you a Fate Apprentice, 100 a Fate Master.',
];

/** Pick today's tip by day-of-year so it rotates daily. */
function tipOfTheDay(now: Date = new Date()): string {
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return FATE_TIPS[dayOfYear % FATE_TIPS.length];
}

/** Screen 1 — My Lists (home). */
export default function ListsScreen() {
  const navigation = useNavigation<Nav>();
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [promptVisible, setPromptVisible] = useState(false);
  const [editing, setEditing] = useState<SetSummary | null>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [streakTitle, setStreakTitle] = useState<string | null>(null);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const tutorialChecked = useRef(false);

  const reload = useCallback(() => {
    setSets(getSetSummaries());
    const s = getStreakState();
    setStreakCount(s.count);
    setStreakTitle(titleForStreak(s.count));
    if (!tutorialChecked.current) {
      tutorialChecked.current = true;
      if (getMeta(TUTORIAL_KEY) !== '1') {
        setTutorialVisible(true);
      }
    }
  }, []);

  useFocusEffect(reload);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => setHelpVisible(true)}
            style={styles.infoButton}
            accessibilityLabel="How Fatevo works"
          >
            <Text style={styles.infoButtonText}>ⓘ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setEditing(null);
              setPromptVisible(true);
            }}
            style={styles.addButton}
            accessibilityLabel="Create new list"
          >
            <Text style={styles.addButtonText}>＋</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  const handleSave = (name: string, emoji?: string) => {
    try {
      if (editing) {
        renameSet(editing.id, name);
      } else {
        const id = createSet(name, emoji);
        setPromptVisible(false);
        reload();
        navigation.navigate('SetDetail', { setId: id });
        return;
      }
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Something went wrong.');
      return;
    }
    setPromptVisible(false);
    reload();
  };

  const handleLongPress = (set: SetSummary) => {
    Alert.alert(set.name, 'What would you like to do?', [
      {
        text: 'Rename',
        onPress: () => {
          setEditing(set);
          setPromptVisible(true);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Delete list?',
            `"${set.name}" and all its options will be gone for good.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  deleteSet(set.id);
                  reload();
                },
              },
            ]
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const nextMilestone = MILESTONES.find((m) => m.days > streakCount) ?? null;
  const progress = nextMilestone ? Math.min(1, streakCount / nextMilestone.days) : 1;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2e2e5c', '#6e5a1e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.streakBanner}
      >
        <Text style={styles.streakFlame}>🔥</Text>
        <View style={styles.streakText}>
          <Text style={styles.streakCount}>
            {streakCount > 0 ? `${streakCount}-day streak` : 'Start your streak'}
          </Text>
          <Text style={styles.streakSub}>
            {nextMilestone
              ? streakCount > 0
                ? `${nextMilestone.days - streakCount} days to ${nextMilestone.title}`
                : 'Roll today to light the flame'
              : `${streakTitle ?? 'Fate Master'} — legendary! 👑`}
          </Text>
          {nextMilestone && streakCount > 0 && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          )}
        </View>
      </LinearGradient>
      {sets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No lists yet</Text>
          <Text style={styles.emptyText}>
            Tap ＋ to create one — "Friday dinner", "Movies", "Baby names"…
          </Text>
        </View>
      ) : (
        <FlatList
          data={sets}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('SetDetail', { setId: item.id })}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={400}
            >
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSub}>
                  {item.optionCount} {item.optionCount === 1 ? 'option' : 'options'}
                  {item.noRepeat ? ' · no-repeat on' : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <View style={styles.tipCard}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipText}>{tipOfTheDay()}</Text>
            </View>
          }
        />
      )}
      <NamePrompt
        visible={promptVisible}
        title={editing ? 'Rename list' : 'New list'}
        placeholder="e.g. Friday dinner"
        initialValue={editing?.name ?? ''}
        showEmojiPicker={!editing}
        saveLabel={editing ? 'Rename' : 'Create'}
        onCancel={() => setPromptVisible(false)}
        onSave={handleSave}
      />
      <Tutorial
        visible={tutorialVisible}
        onDone={() => {
          setMeta(TUTORIAL_KEY, '1');
          setTutorialVisible(false);
        }}
      />
      <HowItWorks visible={helpVisible} onClose={() => setHelpVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: 16,
  },
  streakFlame: { fontSize: 44, marginRight: spacing.md },
  streakText: { flex: 1 },
  streakCount: { fontSize: 20, fontWeight: '800', color: '#fff' },
  streakSub: { fontSize: 13, color: '#ffffffcc', marginTop: 2 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff33',
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardEmoji: { fontSize: 34, marginRight: spacing.md },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  cardSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  chevron: { fontSize: 24, color: colors.muted },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: spacing.xs },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  tipIcon: { fontSize: 22, marginRight: spacing.sm },
  tipText: { flex: 1, fontSize: 14, color: colors.ink, lineHeight: 20 },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  addButtonText: { color: '#fff', fontSize: 22, lineHeight: 24, fontWeight: '600' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButtonText: { color: colors.primary, fontSize: 20, lineHeight: 22, fontWeight: '700' },
});
