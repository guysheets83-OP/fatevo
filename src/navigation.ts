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
    /** Best-of mode: every roll winner in order (length 3). Absent for single rolls. */
    rollSequence?: number[];
    /** Best-of size (3) so "Roll again" repeats the mode. Absent for single rolls. */
    bestOf?: number;
    /**
     * Elimination mode: every option id in knockout order, champion last.
     * Absent for single and best-of rolls.
     */
    knockoutOrder?: number[];
  };
};
