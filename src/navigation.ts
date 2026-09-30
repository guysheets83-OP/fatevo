export type RootStackParamList = {
  Lists: undefined;
  SetDetail: { setId: number };
  OptionEdit: { setId: number; optionId?: number };
  Recap: undefined;
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
     * Best-of sudden death: the tied option ids (2-3) for the extra
     * winner-takes-all spin. Absent unless the 3 rounds produced no
     * plurality winner. The champion (winnerId) is the sudden-death winner.
     */
    suddenDeathTiedIds?: number[];
    /**
     * Elimination mode: every option id in knockout order, champion last.
     * Absent for single and best-of rolls.
     */
    knockoutOrder?: number[];
  };
};
