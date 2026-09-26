export type RootStackParamList = {
  Lists: undefined;
  SetDetail: { setId: number };
  OptionEdit: { setId: number; optionId?: number };
  Result: {
    setId: number;
    winnerId: number;
    streakCount?: number;
    milestoneTitle?: string | null;
    firstRollToday?: boolean;
  };
};
