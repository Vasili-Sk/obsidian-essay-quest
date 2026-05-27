export type AchievementId =
  | "first100"
  | "word500"
  | "word1000"
  | "word2000"
  | "word5000"
  | "word10000"
  | "word20000"
  | "word50000"
  | "word100000"
  | "word200000"
  | "paragraph5"
  | "paragraph10"
  | "paragraph20"
  | "paragraph40"
  | "paragraph100"
  | "paragraph200"
  | "paragraph500"
  | "paragraph1000"
  | "quality80"
  | "quality85"
  | "quality90"
  | "quality95"
  | "level5"
  | "level20"
  | "level100"
  | "level1000"
  | "trim50"
  | "trim200"
  | "trim500"
  | "trim1000"
  | "trim2000"
  | "trim5000"
  | "trim10000"
  | "pomo1h"
  | "pomo5h"
  | "pomo20h"
  | "pomo50h"
  | "pomo100h"
  | "pomo200h"
  | "pomo500h"
  | "pomo1000h"
  | "streak3"
  | "streak7"
  | "streak30"
  | "streak90"
  | "streak180"
  | "streak365"
  | "streak730"
  | "streak1825"
  | "ai25"
  | "ai50"
  | "ai75"
  | "ai100"
  | "wipeout";

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  unlocked: boolean;
  group?: string;
  hidden?: boolean;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  awardedXp: number;
}

export interface DocState {
  words: number;
  paragraphs: number;
  sentences: number;
  quality: number;
  formattingQuality: number;
  xp: number;
  level: number;
  deletedWords: number;
  typedWords: number;
  pastedWords: number;
  pomodoroWorkSeconds: number;
  todos: TodoItem[];
  deletedTodoIds: string[];
  todoDraft: string;
  todoBaselineWords: number;
  todoBaselinePomodoroWorkSeconds: number;
}

export interface PomodoroState {
  running: boolean;
  workMode: boolean;
  remainingSeconds: number;
}

export interface DailyState {
  key: string;
  starterMissionText: string;
  words: number;
  xp: number;
  paragraphs: number;
  sentences: number;
  bestQuality: number;
  pomodoroWorkSeconds: number;
  workLoops: number;
  ninjaScore: number;
  typedWords: number;
  pastedWords: number;
  claimedDailyAchievements: string[];
}

export interface StreakState {
  count: number;
  lastActiveKey: string;
  graceUsedAfterLastActive: boolean;
}

export interface EssayQuestSettings {
  workMinutes: number;
  breakMinutes: number;
  autoRefreshMs: number;
  animationsEnabled: boolean;
  afkAutoPauseEnabled: boolean;
  afkPauseMinutes: number;
  localeMode?: "auto" | "en" | "ru" | "es" | "de";
}

export interface EssayQuestData {
  updatedAt?: number;
  settings: EssayQuestSettings;
  totalXp: number;
  docs: Record<string, DocState>;
  achievements: Achievement[];
  lastAchievementText: string;
  lastGlobalAchievementText?: string;
  lastGlobalAchievementId?: string;
  completedAchievementIds?: AchievementId[];
  daily: DailyState;
  streak: StreakState;
  aiPeakPastePct?: number;
  aiBestRecoveryPct?: number;
  currentMotivationIndex?: number;
  focusHistory?: Record<string, number>;
  pomodoro: PomodoroState;
  uiPrefs?: {
    sectionOrder: string[];
    collapsed: Record<string, boolean>;
    visible: Record<string, boolean>;
  };
}

export interface DailyAchievementDef {
  id: string;
  title: string;
  xp: number;
  met: (d: DailyState) => boolean;
}
