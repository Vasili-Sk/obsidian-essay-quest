import {
  App,
  ItemView,
  MarkdownView,
  Modal,
  PluginSettingTab,
  Notice,
  Plugin,
  Setting,
  TFile,
  WorkspaceLeaf
} from "obsidian";

const VIEW_TYPE_ESSAY_QUEST = "essay-quest-dashboard";

type AchievementId =
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

interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  unlocked: boolean;
  group?: string;
  hidden?: boolean;
}

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  startWords: number;
  startPomodoroWorkSeconds: number;
  awardedXp: number;
}

interface DocState {
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
  todoDraft: string;
}

interface PomodoroState {
  running: boolean;
  workMode: boolean;
  remainingSeconds: number;
}

interface DailyState {
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

interface StreakState {
  count: number;
  lastActiveKey: string;
  graceUsedAfterLastActive: boolean;
}

interface EssayQuestSettings {
  workMinutes: number;
  breakMinutes: number;
  autoRefreshMs: number;
  animationsEnabled: boolean;
  afkAutoPauseEnabled: boolean;
  afkPauseMinutes: number;
}

interface EssayQuestData {
  settings: EssayQuestSettings;
  totalXp: number;
  docs: Record<string, DocState>;
  achievements: Achievement[];
  lastAchievementText: string;
  lastGlobalAchievementText?: string;
  lastGlobalAchievementId?: string;
  daily: DailyState;
  streak: StreakState;
  aiPeakPastePct?: number;
  aiBestRecoveryPct?: number;
  currentMotivationLine?: string;
  activityHistory?: Record<string, "done" | "grace">;
  focusHistory?: Record<string, number>;
  pomodoro: PomodoroState;
  uiPrefs?: {
    sectionOrder: string[];
    collapsed: Record<string, boolean>;
    visible: Record<string, boolean>;
  };
}

interface DailyAchievementDef {
  id: string;
  title: string;
  xp: number;
  met: (d: DailyState) => boolean;
}

const DEFAULT_SETTINGS: EssayQuestSettings = {
  workMinutes: 25,
  breakMinutes: 5,
  autoRefreshMs: 900,
  animationsEnabled: true,
  afkAutoPauseEnabled: true,
  afkPauseMinutes: 15
};

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: "first100", title: "First Steps", description: "Write 100 words.", unlocked: false, group: "words" },
  { id: "word500", title: "Half-K", description: "Write 500 words.", unlocked: false, group: "words" },
  { id: "word1000", title: "Essay Marathon", description: "Write 1000 words.", unlocked: false, group: "words" },
  { id: "word2000", title: "Double Trouble", description: "Write 2000 words.", unlocked: false, group: "words" },
  { id: "word5000", title: "Wordsmith", description: "Write 5000 words.", unlocked: false, group: "words" },
  { id: "word10000", title: "Ten-K Tome", description: "Write 10K words.", unlocked: false, group: "words" },
  { id: "word20000", title: "Chapter Crafter", description: "Write 20K words.", unlocked: false, group: "words" },
  { id: "word50000", title: "Book Builder", description: "Write 50K words.", unlocked: false, group: "words" },
  { id: "word100000", title: "Century Scribe", description: "Write 100K words.", unlocked: false, group: "words" },
  { id: "word200000", title: "Mythic Author", description: "Write 200K words.", unlocked: false, group: "words" },
  { id: "paragraph5", title: "Structure Builder", description: "Write at least 5 paragraphs.", unlocked: false, group: "paragraphs" },
  { id: "paragraph10", title: "Section Architect", description: "Write at least 10 paragraphs.", unlocked: false, group: "paragraphs" },
  { id: "paragraph20", title: "Longform Engineer", description: "Write at least 20 paragraphs.", unlocked: false, group: "paragraphs" },
  { id: "paragraph40", title: "Wall of Thought", description: "Write at least 40 paragraphs.", unlocked: false, group: "paragraphs" },
  { id: "paragraph100", title: "Hundred Blocks", description: "Write at least 100 paragraphs.", unlocked: false, group: "paragraphs" },
  { id: "paragraph200", title: "Two Hundred Blocks", description: "Write at least 200 paragraphs.", unlocked: false, group: "paragraphs" },
  { id: "paragraph500", title: "Paragraph Atlas", description: "Write at least 500 paragraphs.", unlocked: false, group: "paragraphs" },
  { id: "paragraph1000", title: "Paragraph Galaxy", description: "Write at least 1000 paragraphs.", unlocked: false, group: "paragraphs" },
  { id: "quality80", title: "Polished Draft", description: "Reach quality score 80+.", unlocked: false, group: "quality" },
  { id: "quality85", title: "Sharp Editor", description: "Reach quality score 85+.", unlocked: false, group: "quality" },
  { id: "quality90", title: "Golden Draft", description: "Reach quality score 90+.", unlocked: false, group: "quality" },
  { id: "quality95", title: "Near Perfection", description: "Reach quality score 95+.", unlocked: false, group: "quality" },
  { id: "level5", title: "Rising Scholar", description: "Reach level 5.", unlocked: false, group: "level" },
  { id: "level20", title: "Veteran Scholar", description: "Reach level 20.", unlocked: false, group: "level" },
  { id: "level100", title: "Master Scholar", description: "Reach level 100.", unlocked: false, group: "level" },
  { id: "level1000", title: "Sage of Ages", description: "Reach level 1000.", unlocked: false, group: "level" },
  { id: "trim50", title: "Light Editor", description: "Delete 50+ words total.", unlocked: false, group: "ninja" },
  { id: "trim200", title: "Revision Ranger", description: "Delete 200+ words total.", unlocked: false, group: "ninja" },
  { id: "trim500", title: "Master Rewriter", description: "Delete 500+ words total.", unlocked: false, group: "ninja" },
  { id: "trim1000", title: "Blade Runner", description: "Delete 1000+ words total.", unlocked: false, group: "ninja" },
  { id: "trim2000", title: "Cutting Edge", description: "Delete 2000+ words total.", unlocked: false, group: "ninja" },
  { id: "trim5000", title: "Surgical Strike", description: "Delete 5000+ words total.", unlocked: false, group: "ninja" },
  { id: "trim10000", title: "Delete Storm", description: "Delete 10000+ words total.", unlocked: false, group: "ninja" },
  { id: "pomo1h", title: "Focus Spark", description: "Accumulate 1 hour of Pomodoro work.", unlocked: false, group: "pomodoro" },
  { id: "pomo5h", title: "Deep Worker", description: "Accumulate 5 hours of Pomodoro work.", unlocked: false, group: "pomodoro" },
  { id: "pomo20h", title: "Flow Master", description: "Accumulate 20 hours of Pomodoro work.", unlocked: false, group: "pomodoro" },
  { id: "pomo50h", title: "Focus Tank", description: "Accumulate 50 hours of Pomodoro work.", unlocked: false, group: "pomodoro" },
  { id: "pomo100h", title: "Centurion Focus", description: "Accumulate 100 hours of Pomodoro work.", unlocked: false, group: "pomodoro" },
  { id: "pomo200h", title: "Iron Routine", description: "Accumulate 200 hours of Pomodoro work.", unlocked: false, group: "pomodoro" },
  { id: "pomo500h", title: "Monk Mode", description: "Accumulate 500 hours of Pomodoro work.", unlocked: false, group: "pomodoro" },
  { id: "pomo1000h", title: "Time Alchemist", description: "Accumulate 1000 hours of Pomodoro work.", unlocked: false, group: "pomodoro" },
  { id: "streak3", title: "On a Roll", description: "Reach a 3-day streak.", unlocked: false, group: "streak" },
  { id: "streak7", title: "Week Warrior", description: "Reach a 7-day streak.", unlocked: false, group: "streak" },
  { id: "streak30", title: "Legendary Scribe", description: "Reach a 30-day streak.", unlocked: false, group: "streak" },
  { id: "streak90", title: "Quarter Champion", description: "Reach a 3-month streak.", unlocked: false, group: "streak" },
  { id: "streak180", title: "Half-Year Hero", description: "Reach a 6-month streak.", unlocked: false, group: "streak" },
  { id: "streak365", title: "Year of Ink", description: "Reach a 1-year streak.", unlocked: false, group: "streak" },
  { id: "streak730", title: "Twin-Year Titan", description: "Reach a 2-year streak.", unlocked: false, group: "streak" },
  { id: "streak1825", title: "Five-Year Flame", description: "Reach a 5-year streak.", unlocked: false, group: "streak" },
  { id: "ai25", title: "Rewrite Kickoff", description: "Reduce pasted ratio by 10% from your peak.", unlocked: false, group: "ai_recovery" },
  { id: "ai50", title: "Human Comeback", description: "Reduce pasted ratio by 25% from your peak.", unlocked: false, group: "ai_recovery" },
  { id: "ai75", title: "Voice Reclaimed", description: "Reduce pasted ratio by 50% from your peak.", unlocked: false, group: "ai_recovery" },
  { id: "ai100", title: "All Synth, No Sleep", description: "Reach 100% pasted ratio at least once.", unlocked: false, group: "easter", hidden: true },
  { id: "wipeout", title: "Nope, Starting Fresh", description: "Delete an entire document to reset your mind.", unlocked: false, group: "easter", hidden: true }
];

const DAILY_ACHIEVEMENTS: DailyAchievementDef[] = [
  { id: "daily_focus_5", title: "Focus 5 min today", xp: 8, met: (d) => d.pomodoroWorkSeconds >= 300 },
  { id: "daily_words_250", title: "Write 250 words today", xp: 20, met: (d) => d.words >= 250 },
  { id: "daily_words_700", title: "Write 700 words today", xp: 45, met: (d) => d.words >= 700 },
  { id: "daily_focus_25", title: "Focus 25 min today", xp: 25, met: (d) => d.pomodoroWorkSeconds >= 1500 },
  {
    id: "daily_ai_recovery_10",
    title: "Soulforge Rewrite",
    xp: 20,
    met: (d) => {
      const total = Math.max(1, d.typedWords + d.pastedWords);
      const rec = Math.round((d.typedWords * 100) / total);
      return d.pastedWords >= 40 && total >= 80 && rec >= 60;
    }
  }
];

function dateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function countWords(text: string): number {
  const m = text.match(/[A-Za-z0-9']+/g);
  return m ? m.length : 0;
}

function countParagraphs(text: string): number {
  return text
    .split(/\r?\n\s*\r?\n/g)
    .map((p) => p.trim())
    .filter(Boolean).length;
}

function countSentences(text: string): number {
  const m = text.match(/[.!?]+/g);
  return Math.max(1, m ? m.length : 0);
}

function qualityScore(text: string, words: number, paragraphs: number, sentences: number): number {
  if (words === 0) return 0;
  let score = 0;
  score += Math.min(35, Math.floor((words * 35) / 800));
  const avgSentence = words / Math.max(1, sentences);
  if (avgSentence >= 10 && avgSentence <= 25) score += 20;
  else if (avgSentence >= 7 && avgSentence <= 30) score += 12;
  else score += 6;
  score += Math.min(20, paragraphs * 4);

  const transitions = ["however", "therefore", "moreover", "furthermore", "consequently", "nevertheless", "additionally", "thus", "instead", "meanwhile"];
  const lower = text.toLowerCase();
  let transitionHits = 0;
  for (const t of transitions) {
    if (lower.includes(` ${t} `)) transitionHits++;
  }
  score += Math.min(15, transitionHits * 3);

  const tokens = text.toLowerCase().match(/[A-Za-z0-9']+/g) ?? [];
  const unique = new Set(tokens);
  const diversity = tokens.length ? unique.size / tokens.length : 0;
  if (diversity >= 0.45) score += 10;
  else if (diversity >= 0.3) score += 6;
  else score += 3;

  return Math.min(100, Math.max(0, score));
}

function formattingQualityScore(text: string): number {
  const headingHits = (text.match(/^#{1,6}\s+/gm) ?? []).length;
  const boldHits = (text.match(/(\*\*|__)[^\n]+?\1/g) ?? []).length;
  const italicHits = (text.match(/(\*|_)[^\n*_]+?\1/g) ?? []).length;
  const listHits = (text.match(/^\s*([-*+]|\d+\.)\s+/gm) ?? []).length;
  const quoteHits = (text.match(/^\s*>\s+/gm) ?? []).length;
  const codeHits = (text.match(/`[^`\n]+`|```[\s\S]*?```/g) ?? []).length;
  const linkHits = (text.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length;
  const tableHits = (text.match(/^\|.+\|$/gm) ?? []).length;
  const totalWords = countWords(text);
  const categoryCount =
    Number(headingHits > 0) +
    Number(boldHits + italicHits > 0) +
    Number(listHits > 0) +
    Number(quoteHits > 0) +
    Number(codeHits > 0) +
    Number(linkHits > 0) +
    Number(tableHits > 0);
  const densityRaw = headingHits * 4 + boldHits * 2 + italicHits + listHits * 2 + quoteHits * 2 + codeHits * 3 + linkHits * 2 + tableHits * 3;
  const densityNorm = totalWords > 0 ? Math.min(1, densityRaw / Math.max(12, totalWords / 20)) : 0;
  const score = Math.min(100, Math.round(categoryCount * 10 + densityNorm * 30));
  return Math.max(0, score);
}

function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 120) + 1);
}

function safeNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default class EssayQuestPlugin extends Plugin {
  data!: EssayQuestData;
  pomodoroIntervalId: number | null = null;
  refreshDebounceId: number | null = null;
  lastUserActivityTs = Date.now();
  readonly motivationPools: string[][] = [
    [
      "Write one bad sentence on purpose, then improve it.",
      "Start with 3 bullet points, not full paragraphs.",
      "Type for 60 seconds only, then decide to continue.",
      "Open with: 'The point of this section is...'.",
      "Shrink task: draft just the first 2 lines.",
      "Name the next tiny step, then do only that.",
      "Paste your prompt line: 'Today I will finish...'.",
      "Start messy. Editing comes in the next loop.",
      "Write a rough headline, then one supporting line.",
      "If stuck, answer this: what is one thing I know?"
    ],
    [
      "Nice rhythm. Keep the blade warm.",
      "You are already in motion.",
      "Small streaks become big wins.",
      "Focus is building, trust it.",
      "Another loop, another upgrade.",
      "Checkpoint reached. Keep the combo alive.",
      "Your draft is loading momentum.",
      "Hold the line for one more paragraph.",
      "No AFK, just one clean push.",
      "Keep farming progress, not perfection."
    ],
    [
      "No scope, all focus.",
      "Main quest: finish this paragraph.",
      "GG, your draft just leveled up.",
      "Respawn complete. Back to the grind.",
      "Speedrun this section, clean and calm.",
      "Quest log updated: paragraph complete.",
      "You are stacking reliable reps.",
      "Microskill unlocked: finishing before polishing.",
      "Combo chain active. Do not drop it.",
      "This is where writing gets easier."
    ],
    [
      "Raid boss: procrastination. You are winning.",
      "Your keyboard is carrying this match.",
      "Clutch mode activated.",
      "Patch notes: confidence buff applied.",
      "No AFK, only XP farm.",
      "You are in ranked focus now.",
      "Objective secured. Rotate to next section.",
      "Damage phase: draft first, refine second.",
      "Team morale buff: you showed up.",
      "Keep pressure, clean execution."
    ],
    [
      "Legendary drop: consistency.",
      "Final boss energy. Keep pushing.",
      "You are cracked at deep work.",
      "Lore accurate writer arc.",
      "Queue one more loop. Easy dub.",
      "Prestige run: finish with intent.",
      "You are building elite repetition.",
      "Peak form: calm, fast, deliberate.",
      "One more clean loop to lock the win.",
      "Mission almost done. Close strong."
    ]
  ];

  async onload(): Promise<void> {
    await this.loadDataStore();
    this.registerView(VIEW_TYPE_ESSAY_QUEST, (leaf) => new EssayQuestView(leaf, this));
    this.addRibbonIcon("sword", "Essay Quest Dashboard", () => this.activateView());
    this.addCommand({ id: "toggle-essay-quest", name: "Toggle Essay Quest Dashboard", callback: () => this.activateView() });
    this.addSettingTab(new EssayQuestSettingsTab(this.app, this));
    this.registerEditorChangeHandlers();
    void this.refreshFromActiveFile();
    this.startPomodoroTicker();
  }

  onunload(): void {
    if (this.pomodoroIntervalId) window.clearInterval(this.pomodoroIntervalId);
    if (this.refreshDebounceId) window.clearTimeout(this.refreshDebounceId);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_ESSAY_QUEST);
  }

  async loadDataStore(): Promise<void> {
    const raw = await this.loadData();
    this.data = raw ?? {
      settings: { ...DEFAULT_SETTINGS },
      totalXp: 0,
      docs: {},
      achievements: DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a })),
      lastAchievementText: "New achievement: (none yet)",
      lastGlobalAchievementText: "",
      daily: { key: dateKey(), starterMissionText: "Write one bad sentence on purpose, then improve it.", words: 0, xp: 0, paragraphs: 0, sentences: 0, bestQuality: 0, pomodoroWorkSeconds: 0, workLoops: 0, ninjaScore: 0, typedWords: 0, pastedWords: 0, claimedDailyAchievements: [] },
      streak: { count: 0, lastActiveKey: "", graceUsedAfterLastActive: false },
      aiPeakPastePct: 0,
      aiBestRecoveryPct: 0,
      currentMotivationLine: "Tiny steps still forge legends.",
      activityHistory: {},
      focusHistory: {},
      pomodoro: { running: false, workMode: true, remainingSeconds: DEFAULT_SETTINGS.workMinutes * 60 }
    };
    if (!this.data.settings) this.data.settings = { ...DEFAULT_SETTINGS };
    this.data.settings.workMinutes = Math.max(1, Math.min(240, safeNum(this.data.settings.workMinutes, 25)));
    this.data.settings.breakMinutes = Math.max(1, Math.min(240, safeNum(this.data.settings.breakMinutes, 5)));
    this.data.settings.autoRefreshMs = Math.max(300, Math.min(5000, safeNum(this.data.settings.autoRefreshMs, 900)));
    this.data.settings.animationsEnabled = this.data.settings.animationsEnabled !== false;
    this.data.settings.afkAutoPauseEnabled = this.data.settings.afkAutoPauseEnabled !== false;
    this.data.settings.afkPauseMinutes = Math.max(1, Math.min(120, safeNum(this.data.settings.afkPauseMinutes, 15)));
    this.data.totalXp = Math.max(0, safeNum(this.data.totalXp, 0));
    if (!this.data.daily || this.data.daily.key !== dateKey()) {
      this.data.daily = { key: dateKey(), starterMissionText: this.pickMotivationLine(0, true), words: 0, xp: 0, paragraphs: 0, sentences: 0, bestQuality: 0, pomodoroWorkSeconds: 0, workLoops: 0, ninjaScore: 0, typedWords: 0, pastedWords: 0, claimedDailyAchievements: [] };
    }
    if (!this.data.streak) this.data.streak = { count: 0, lastActiveKey: "", graceUsedAfterLastActive: false };
    this.data.aiPeakPastePct = Math.max(0, Math.min(100, safeNum(this.data.aiPeakPastePct, 0)));
    this.data.aiBestRecoveryPct = Math.max(0, Math.min(100, safeNum(this.data.aiBestRecoveryPct, 0)));
    if (typeof this.data.currentMotivationLine !== "string" || this.data.currentMotivationLine.trim().length === 0) {
      this.data.currentMotivationLine = this.pickMotivationLine(this.data.daily.workLoops, this.data.pomodoro.workMode);
    } else if (!this.isMotivationLineValidForCurrentTier(this.data.currentMotivationLine, this.data.daily.workLoops)) {
      this.data.currentMotivationLine = this.pickMotivationLine(this.data.daily.workLoops, this.data.pomodoro.workMode);
    }
    if (!this.data.activityHistory) this.data.activityHistory = {};
    if (!this.data.focusHistory) this.data.focusHistory = {};
    for (const k of Object.keys(this.data.focusHistory)) {
      this.data.focusHistory[k] = Math.max(0, Math.min(100, safeNum(this.data.focusHistory[k], 0)));
    }
    if (!this.data.uiPrefs) {
      this.data.uiPrefs = {
        sectionOrder: ["document", "todo", "daily", "achievements", "global"],
        collapsed: {},
        visible: { document: true, todo: true, daily: true, achievements: true, global: false }
      };
    }
    const allowed = new Set(["document", "todo", "daily", "achievements", "global"]);
    const current = Array.isArray(this.data.uiPrefs.sectionOrder) ? this.data.uiPrefs.sectionOrder.filter((s) => allowed.has(s)) : [];
    for (const s of ["document", "todo", "daily", "achievements", "global"]) {
      if (!current.includes(s)) current.push(s);
    }
    this.data.uiPrefs.sectionOrder = current;
    this.data.uiPrefs.collapsed = this.data.uiPrefs.collapsed ?? {};
    this.data.uiPrefs.visible = this.data.uiPrefs.visible ?? { document: true, todo: true, daily: true, achievements: true, global: false };
    for (const s of ["document", "todo", "daily", "achievements", "global"]) {
      if (typeof this.data.uiPrefs.visible[s] !== "boolean") this.data.uiPrefs.visible[s] = s !== "global";
    }
    const hasVisible = ["document", "todo", "daily", "achievements", "global"].some((s) => this.data.uiPrefs?.visible?.[s] !== false);
    if (!hasVisible) {
      this.data.uiPrefs.visible.document = true;
      this.data.uiPrefs.visible.todo = true;
      this.data.uiPrefs.visible.daily = true;
      this.data.uiPrefs.visible.achievements = true;
      this.data.uiPrefs.visible.global = false;
    }
    this.mergeAchievementsFromDefaults();
    if (typeof this.data.lastGlobalAchievementText !== "string") this.data.lastGlobalAchievementText = "";
    if (typeof this.data.lastGlobalAchievementId !== "string") this.data.lastGlobalAchievementId = "";
    this.data.daily.words = Math.max(0, safeNum(this.data.daily.words, 0));
    this.data.daily.xp = Math.max(0, safeNum(this.data.daily.xp, 0));
    this.data.daily.paragraphs = Math.max(0, safeNum(this.data.daily.paragraphs, 0));
    this.data.daily.sentences = Math.max(0, safeNum(this.data.daily.sentences, 0));
    this.data.daily.bestQuality = Math.max(0, Math.min(100, safeNum(this.data.daily.bestQuality, 0)));
    this.data.daily.pomodoroWorkSeconds = Math.max(0, safeNum(this.data.daily.pomodoroWorkSeconds, 0));
    this.data.daily.workLoops = Math.max(0, safeNum((this.data.daily as Partial<DailyState>).workLoops, 0));
    if (typeof (this.data.daily as Partial<DailyState>).starterMissionText !== "string" || this.data.daily.starterMissionText.trim().length === 0) {
      this.data.daily.starterMissionText = this.pickMotivationLine(0, true);
    }
    this.data.daily.ninjaScore = Math.max(0, safeNum(this.data.daily.ninjaScore, 0));
    this.data.daily.typedWords = Math.max(0, safeNum((this.data.daily as Partial<DailyState>).typedWords, 0));
    this.data.daily.pastedWords = Math.max(0, safeNum((this.data.daily as Partial<DailyState>).pastedWords, 0));
    this.data.daily.claimedDailyAchievements = Array.isArray(this.data.daily.claimedDailyAchievements) ? this.data.daily.claimedDailyAchievements : [];
    this.data.streak.count = Math.max(0, safeNum(this.data.streak.count, 0));
    this.data.pomodoro.remainingSeconds = Math.max(0, safeNum(this.data.pomodoro.remainingSeconds, this.data.settings.workMinutes * 60));
    this.data.pomodoro.running = !!this.data.pomodoro.running;
    this.data.pomodoro.workMode = this.data.pomodoro.workMode !== false;
    for (const k of Object.keys(this.data.docs)) {
      const d = this.data.docs[k];
      d.words = Math.max(0, safeNum(d.words, 0));
      d.paragraphs = Math.max(0, safeNum(d.paragraphs, 0));
      d.sentences = Math.max(0, safeNum(d.sentences, 0));
      d.quality = Math.max(0, Math.min(100, safeNum(d.quality, 0)));
      d.formattingQuality = Math.max(0, Math.min(100, safeNum((d as Partial<DocState>).formattingQuality, 0)));
      d.xp = Math.max(0, safeNum(d.xp, this.data.totalXp));
      d.level = Math.max(1, safeNum(d.level, levelFromXp(d.xp)));
      d.deletedWords = Math.max(0, safeNum(d.deletedWords, 0));
      d.typedWords = Math.max(0, safeNum((d as Partial<DocState>).typedWords, d.words));
      d.pastedWords = Math.max(0, safeNum((d as Partial<DocState>).pastedWords, 0));
      d.pomodoroWorkSeconds = Math.max(0, safeNum(d.pomodoroWorkSeconds, 0));
      const rawTodos = Array.isArray(d.todos) ? (d.todos as Partial<TodoItem>[]) : [];
      d.todos = rawTodos.map((t: Partial<TodoItem>) => ({
        id: String(t.id ?? `todo_${Date.now()}_${Math.floor(Math.random() * 100000)}`),
        text: String(t.text ?? ""),
        done: !!t.done,
        startWords: Math.max(0, safeNum(t.startWords, d.words)),
        startPomodoroWorkSeconds: Math.max(0, safeNum(t.startPomodoroWorkSeconds, d.pomodoroWorkSeconds)),
        awardedXp: Math.max(0, safeNum(t.awardedXp, 0))
      }));
      d.todoDraft = typeof d.todoDraft === "string" ? d.todoDraft : "";
    }
    await this.saveDataStore();
  }

  mergeAchievementsFromDefaults(): void {
    const existing = new Map<string, Achievement>();
    for (const a of this.data.achievements ?? []) {
      existing.set(a.id, a);
    }
    const merged: Achievement[] = [];
    for (const def of DEFAULT_ACHIEVEMENTS) {
      const old = existing.get(def.id);
      if (old) {
        merged.push({
          id: def.id,
          title: def.title,
          description: def.description,
          unlocked: !!old.unlocked,
          group: def.group,
          hidden: def.hidden
        });
      } else {
        merged.push({ ...def });
      }
    }
    this.data.achievements = merged;
  }

  async saveDataStore(): Promise<void> {
    await this.saveData(this.data);
  }

  async activateView(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ESSAY_QUEST);
    if (leaves.length > 0) {
      this.app.workspace.revealLeaf(leaves[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: VIEW_TYPE_ESSAY_QUEST, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  registerEditorChangeHandlers(): void {
    this.registerEvent(this.app.workspace.on("editor-change", () => {
      this.markUserActivity();
      this.scheduleRefreshFromActiveFile();
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
      this.markUserActivity();
      this.scheduleRefreshFromActiveFile();
    }));
    this.registerEvent(this.app.vault.on("modify", (f) => {
      const active = this.getActiveFile();
      if (active && f.path === active.path) {
        this.markUserActivity();
        this.scheduleRefreshFromActiveFile();
      }
    }));
    this.registerDomEvent(document, "keydown", () => this.markUserActivity());
    this.registerDomEvent(document, "mousedown", () => this.markUserActivity());
    this.registerDomEvent(document, "mousemove", () => this.markUserActivity());
    this.registerDomEvent(document, "wheel", () => this.markUserActivity());
  }

  markUserActivity(): void {
    this.lastUserActivityTs = Date.now();
  }

  scheduleRefreshFromActiveFile(): void {
    if (this.refreshDebounceId) window.clearTimeout(this.refreshDebounceId);
    // Debounce avoids rerender storms while typing/clicking.
    this.refreshDebounceId = window.setTimeout(() => {
      void this.refreshFromActiveFile();
    }, 220);
  }

  startPomodoroTicker(): void {
    if (this.pomodoroIntervalId) window.clearInterval(this.pomodoroIntervalId);
    this.pomodoroIntervalId = window.setInterval(async () => {
      this.rollOverDayIfNeeded();
      const p = this.data.pomodoro;
      if (!p.running) return;
      if (this.data.settings.afkAutoPauseEnabled) {
        const idleMs = Date.now() - this.lastUserActivityTs;
        const thresholdMs = this.data.settings.afkPauseMinutes * 60 * 1000;
        if (idleMs >= thresholdMs) {
          p.running = false;
          new Notice(`Paused due to inactivity (${this.data.settings.afkPauseMinutes} min).`);
          await this.saveDataStore();
          this.refreshView();
          return;
        }
      }

      const active = this.getActiveFile();
      if (active && active.extension === "md") {
        const current = this.data.docs[active.path];
        if (current) {
          if (p.workMode) {
            current.pomodoroWorkSeconds += 1;
            this.data.daily.pomodoroWorkSeconds += 1;
          }
        }
      }

      p.remainingSeconds -= 1;
      let phaseSwitched = false;
      if (p.remainingSeconds <= 0) {
        const finishedWork = p.workMode;
        p.workMode = !p.workMode;
        phaseSwitched = true;
        if (finishedWork) {
          this.data.daily.workLoops += 1;
        }
        this.data.currentMotivationLine = this.pickMotivationLine(this.data.daily.workLoops, p.workMode);
        p.remainingSeconds = (p.workMode ? this.data.settings.workMinutes : this.data.settings.breakMinutes) * 60;
        new Notice(p.workMode ? "Break ended. Back to work." : "Work session done. Take a break.");
        this.playPomodoroSwitchSound(p.workMode);
      }
      this.updateTodayFocusHistory();
      await this.saveDataStore();
      // Avoid full rerender every second (it interrupts hover/tooltips); update live timer UI directly.
      this.updateLivePomodoroUi();
      // Full rerender only on phase switch or minute boundary to avoid animation restarts/stutter.
      if (phaseSwitched || p.remainingSeconds % 60 === 0) this.refreshView();
    }, 1000);
  }

  updateLivePomodoroUi(): void {
    const p = this.data.pomodoro;
    const remainingSafe = Math.max(0, safeNum(p.remainingSeconds, 0));
    const mm = Math.floor(remainingSafe / 60).toString().padStart(2, "0");
    const ss = (remainingSafe % 60).toString().padStart(2, "0");
    const phaseDuration = (p.workMode ? this.data.settings.workMinutes : this.data.settings.breakMinutes) * 60;
    const phasePct = Math.max(0, Math.min(100, Math.floor((remainingSafe * 100) / Math.max(1, phaseDuration))));
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_ESSAY_QUEST)) {
      const view = leaf.view as EssayQuestView;
      const c = view.containerEl.children[1] as HTMLElement;
      const timerEl = c.querySelector(".eq-timer") as HTMLElement | null;
      if (timerEl) timerEl.setText(`${mm}:${ss}`);
      const phaseEl = c.querySelector(".eq-timer-phase") as HTMLElement | null;
      if (phaseEl) {
        const loops = Math.max(0, this.data.daily.workLoops);
        phaseEl.setText(`${p.workMode ? "Work" : "Break"} #${loops}`);
      }
      const fillEl = c.querySelector(".eq-pomo-bar-fill-work, .eq-pomo-bar-fill-break") as HTMLElement | null;
      if (fillEl) fillEl.style.width = `${phasePct}%`;
      const toggle = c.querySelector(".eq-pomo-toggle") as HTMLButtonElement | null;
      if (toggle) toggle.textContent = p.running ? "⏸︎ Pause" : `▶ ${(view as EssayQuestView).dailyStartLabel()}`;
    }
  }

  playPomodoroSwitchSound(toWorkMode: boolean): void {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const beep = (freq: number, start: number, dur: number): void => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };
    const now = ctx.currentTime + 0.02;
    if (toWorkMode) {
      beep(740, now, 0.08);
      beep(980, now + 0.1, 0.08);
    } else {
      beep(540, now, 0.1);
      beep(420, now + 0.12, 0.1);
    }
    window.setTimeout(() => ctx.close(), 500);
  }

  getActiveFile(): TFile | null {
    const v = this.app.workspace.getActiveFile();
    return v ?? null;
  }

  getActiveEditorText(): string | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = view?.editor;
    return editor ? editor.getValue() : null;
  }

  async refreshFromActiveFile(): Promise<void> {
    const file = this.getActiveFile();
    if (!file || file.extension !== "md") return;

    this.rollOverDayIfNeeded();

    const live = this.getActiveEditorText();
    const content = live ?? (await this.app.vault.cachedRead(file));
    const words = countWords(content);
    const paragraphs = countParagraphs(content);
    const sentences = countSentences(content);
    const quality = qualityScore(content, words, paragraphs, sentences);
    const formattingQuality = formattingQualityScore(content);

    const prev = this.data.docs[file.path] ?? {
      words: 0,
      paragraphs: 0,
      sentences: 0,
      quality: 0,
      formattingQuality: 0,
      xp: this.data.totalXp,
      level: levelFromXp(this.data.totalXp),
      deletedWords: 0,
      typedWords: 0,
      pastedWords: 0,
      pomodoroWorkSeconds: 0,
      todos: [],
      todoDraft: ""
    };

    const deltaWords = Math.max(0, words - prev.words);
    const deletedThisStep = Math.max(0, prev.words - words);
    const wasWipeout = prev.words > 0 && words === 0;
    const restoredFromRearrange = Math.min(deltaWords, deletedThisStep);
    const remainingDelta = Math.max(0, deltaWords - restoredFromRearrange);
    const effectiveDeletedThisStep = Math.max(0, deletedThisStep - restoredFromRearrange);
    // Heuristic:
    // 1-2 new words in a refresh window are likely typing.
    // 3+ new words are likely paste/autocomplete burst.
    const pastedThisStep = remainingDelta >= 3 ? remainingDelta : 0;
    const typedThisStep = remainingDelta - pastedThisStep;

    // Rebalanced XP: reward meaningful human-writing chunks, avoid 1-word spikes.
    const humanDelta = Math.max(0, typedThisStep);
    const baseXp = Math.floor(humanDelta / 8);
    const starterXp = humanDelta >= 3 ? 1 : 0;
    const qualityBonus = humanDelta >= 20 ? (quality >= 80 ? 2 : quality >= 65 ? 1 : 0) : 0;
    const paragraphGain = Math.max(0, paragraphs - prev.paragraphs);
    const structureBonus = paragraphGain > 0 ? 1 : 0;
    const allowXpProgress = this.data.pomodoro.running;
    const rawXpGain = Math.min(12, baseXp + starterXp + qualityBonus + structureBonus);
    const xpGain = allowXpProgress ? rawXpGain : 0;

    this.data.totalXp += xpGain;
    const level = levelFromXp(this.data.totalXp);

    this.data.docs[file.path] = {
      words,
      paragraphs,
      sentences,
      quality,
      formattingQuality,
      xp: this.data.totalXp,
      level,
      deletedWords: prev.deletedWords + effectiveDeletedThisStep,
      typedWords: prev.typedWords + typedThisStep,
      pastedWords: prev.pastedWords + pastedThisStep,
      pomodoroWorkSeconds: prev.pomodoroWorkSeconds ?? 0,
      todos: prev.todos ?? [],
      todoDraft: typeof prev.todoDraft === "string" ? prev.todoDraft : ""
    };

    // Daily is a delta tracker for writing activity, independent from XP gating.
    if (deltaWords > 0) {
      this.data.daily.words += typedThisStep;
      this.data.daily.xp += xpGain;
      this.data.daily.typedWords += typedThisStep;
      this.data.daily.pastedWords += pastedThisStep;
      this.data.daily.paragraphs += Math.max(0, paragraphs - prev.paragraphs);
      this.data.daily.sentences += Math.max(0, sentences - prev.sentences);
      this.data.daily.bestQuality = Math.max(this.data.daily.bestQuality, quality);
    }
    if (effectiveDeletedThisStep > 0) {
      this.data.daily.ninjaScore += effectiveDeletedThisStep;
    }
    this.updateTodayActivityHighlight();
    this.updateTodayFocusHistory();

    this.unlockAchievements(this.data.docs[file.path], allowXpProgress, wasWipeout);
    this.applyDailyAchievementXp(allowXpProgress);
    this.updateTodayFocusHistory();
    await this.saveDataStore();
    this.refreshView();
  }

  applyDailyAchievementXp(allowProgress: boolean): void {
    if (!allowProgress) return;
    this.updateTodayActivityHighlight();
    for (const d of DAILY_ACHIEVEMENTS) {
      if (this.data.daily.claimedDailyAchievements.includes(d.id)) continue;
      if (d.met(this.data.daily)) {
        this.data.daily.claimedDailyAchievements.push(d.id);
        this.data.daily.xp += d.xp;
        this.data.totalXp += d.xp;
        this.data.lastAchievementText = `Daily achievement complete: ${d.title} (+${d.xp} XP)`;
      }
    }
  }

  updateTodayActivityHighlight(): void {
    if (!this.data.activityHistory) this.data.activityHistory = {};
    const today = this.data.daily.key;
    // Day activity counts only after at least 1 minute of pomodoro.
    if (this.data.daily.pomodoroWorkSeconds >= 60) {
      this.data.activityHistory[today] = "done";
    }
  }

  computeDailyFocusScore(d: DailyState): number {
    const timeScore = Math.min(40, Math.floor(d.pomodoroWorkSeconds / 60));
    const outputScore = Math.min(35, Math.floor(d.words / 10));
    const loopScore = Math.min(15, d.workLoops * 3);
    const craftScore = Math.min(10, Math.floor(d.bestQuality / 10));
    return Math.max(0, Math.min(100, timeScore + outputScore + loopScore + craftScore));
  }

  updateTodayFocusHistory(): void {
    if (!this.data.focusHistory) this.data.focusHistory = {};
    const key = this.data.daily.key;
    const current = this.computeDailyFocusScore(this.data.daily);
    const prev = Math.max(0, Math.min(100, safeNum(this.data.focusHistory[key], 0)));
    this.data.focusHistory[key] = Math.max(prev, current);
  }

  rollOverDayIfNeeded(): void {
    if (this.data.daily.key === dateKey()) return;
    this.rollOverDay();
      this.data.daily = { key: dateKey(), starterMissionText: this.pickMotivationLine(0, true), words: 0, xp: 0, paragraphs: 0, sentences: 0, bestQuality: 0, pomodoroWorkSeconds: 0, workLoops: 0, ninjaScore: 0, typedWords: 0, pastedWords: 0, claimedDailyAchievements: [] };
    this.data.pomodoro.workMode = true;
    this.data.pomodoro.running = false;
    this.data.pomodoro.remainingSeconds = this.data.settings.workMinutes * 60;
    this.data.currentMotivationLine = this.pickMotivationLine(0, true);
  }

  pickMotivationLine(workLoops: number, workMode: boolean): string {
    const tier = Math.max(0, Math.min(4, Math.floor(workLoops)));
    const pool = this.motivationPools[tier] ?? this.motivationPools[0];
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? "Keep going.";
    return pick;
  }

  isMotivationLineValidForCurrentTier(line: string, workLoops: number): boolean {
    const tier = Math.max(0, Math.min(4, Math.floor(workLoops)));
    const pool = this.motivationPools[tier] ?? this.motivationPools[0];
    if (pool.includes(line)) return true;
    if (line.startsWith("Break: ")) {
      const raw = line.slice("Break: ".length);
      if (pool.includes(raw)) return true;
    }
    return false;
  }

  unlockAchievements(current: DocState, allow: boolean, wasWipeout = false): void {
    const docs = Object.values(this.data.docs);
    const globalDeleted = docs.reduce((s, d) => s + safeNum(d.deletedWords, 0), 0);
    const totalPomodoroWorkSeconds = docs.reduce((s, d) => s + safeNum(d.pomodoroWorkSeconds, 0), 0);
    const streakCount = safeNum(this.data.streak.count, 0);
    const totalWords = docs.reduce((s, d) => s + safeNum(d.words, 0), 0);
    const bestQuality = docs.reduce((m, d) => Math.max(m, safeNum(d.quality, 0)), 0);
    const bestParagraphs = docs.reduce((m, d) => Math.max(m, safeNum(d.paragraphs, 0)), 0);
    const typedTotal = docs.reduce((s, d) => s + safeNum((d as Partial<DocState>).typedWords, 0), 0);
    const pastedTotal = docs.reduce((s, d) => s + safeNum((d as Partial<DocState>).pastedWords, 0), 0);
    const aiRatio = typedTotal + pastedTotal > 0 ? (pastedTotal * 100) / (typedTotal + pastedTotal) : 0;
    this.data.aiPeakPastePct = Math.max(safeNum(this.data.aiPeakPastePct, 0), aiRatio);
    const aiRecovery = Math.max(0, safeNum(this.data.aiPeakPastePct, 0) - aiRatio);
    this.data.aiBestRecoveryPct = Math.max(safeNum(this.data.aiBestRecoveryPct, 0), aiRecovery);

    const map: Record<AchievementId, boolean> = {
      first100: totalWords >= 100,
      word500: totalWords >= 500,
      word1000: totalWords >= 1000,
      word2000: totalWords >= 2000,
      word5000: totalWords >= 5000,
      word10000: totalWords >= 10000,
      word20000: totalWords >= 20000,
      word50000: totalWords >= 50000,
      word100000: totalWords >= 100000,
      word200000: totalWords >= 200000,
      paragraph5: bestParagraphs >= 5,
      paragraph10: bestParagraphs >= 10,
      paragraph20: bestParagraphs >= 20,
      paragraph40: bestParagraphs >= 40,
      paragraph100: bestParagraphs >= 100,
      paragraph200: bestParagraphs >= 200,
      paragraph500: bestParagraphs >= 500,
      paragraph1000: bestParagraphs >= 1000,
      quality80: bestQuality >= 80,
      quality85: bestQuality >= 85,
      quality90: bestQuality >= 90,
      quality95: bestQuality >= 95,
      level5: current.level >= 5,
      level20: current.level >= 20,
      level100: current.level >= 100,
      level1000: current.level >= 1000,
      trim50: globalDeleted >= 50,
      trim200: globalDeleted >= 200,
      trim500: globalDeleted >= 500,
      trim1000: globalDeleted >= 1000,
      trim2000: globalDeleted >= 2000,
      trim5000: globalDeleted >= 5000,
      trim10000: globalDeleted >= 10000,
      pomo1h: totalPomodoroWorkSeconds >= 3600,
      pomo5h: totalPomodoroWorkSeconds >= 18000,
      pomo20h: totalPomodoroWorkSeconds >= 72000,
      pomo50h: totalPomodoroWorkSeconds >= 180000,
      pomo100h: totalPomodoroWorkSeconds >= 360000,
      pomo200h: totalPomodoroWorkSeconds >= 720000,
      pomo500h: totalPomodoroWorkSeconds >= 1800000,
      pomo1000h: totalPomodoroWorkSeconds >= 3600000,
      streak3: streakCount >= 3,
      streak7: streakCount >= 7,
      streak30: streakCount >= 30,
      streak90: streakCount >= 90,
      streak180: streakCount >= 180,
      streak365: streakCount >= 365,
      streak730: streakCount >= 730,
      streak1825: streakCount >= 1825,
      ai25: safeNum(this.data.aiBestRecoveryPct, 0) >= 10,
      ai50: safeNum(this.data.aiBestRecoveryPct, 0) >= 25,
      ai75: safeNum(this.data.aiBestRecoveryPct, 0) >= 50,
      ai100: aiRatio >= 99.9,
      wipeout: wasWipeout
    };

    for (const a of this.data.achievements) {
      if (!allow) continue;
      if (!a.unlocked && map[a.id]) {
        a.unlocked = true;
        this.data.lastAchievementText = allow ? `New achievement: ${a.title} [during active pomodoro]` : `New achievement: ${a.title}`;
        this.data.lastGlobalAchievementText = `New global achievement: ${a.title}`;
        this.data.lastGlobalAchievementId = a.id;
      }
    }
  }

  resetSession(): void {
    this.data.totalXp = 0;
    for (const k of Object.keys(this.data.docs)) {
      const d = this.data.docs[k];
      d.words = 0;
      d.paragraphs = 0;
      d.sentences = 0;
      d.quality = 0;
      d.formattingQuality = 0;
      d.deletedWords = 0;
      d.typedWords = 0;
      d.pastedWords = 0;
      d.pomodoroWorkSeconds = 0;
      d.xp = 0;
      d.level = 1;
      // keep todos and draft untouched
    }
    this.data.daily = { key: dateKey(), starterMissionText: this.pickMotivationLine(0, true), words: 0, xp: 0, paragraphs: 0, sentences: 0, bestQuality: 0, pomodoroWorkSeconds: 0, workLoops: 0, ninjaScore: 0, typedWords: 0, pastedWords: 0, claimedDailyAchievements: [] };
    this.saveDataStore();
    this.refreshView();
  }

  resetAchievements(): void {
    this.data.achievements = DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a }));
    this.data.lastAchievementText = "New achievement: (none yet)";
    this.data.lastGlobalAchievementText = "";
    this.data.lastGlobalAchievementId = "";
    this.saveDataStore();
    this.refreshView();
  }

  resetGlobalProgress(): void {
    this.data.totalXp = 0;
    // Keep per-document progress untouched.
    this.data.daily = { key: dateKey(), starterMissionText: this.pickMotivationLine(0, true), words: 0, xp: 0, paragraphs: 0, sentences: 0, bestQuality: 0, pomodoroWorkSeconds: 0, workLoops: 0, ninjaScore: 0, typedWords: 0, pastedWords: 0, claimedDailyAchievements: [] };
    this.data.achievements = DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a }));
    this.data.lastAchievementText = "New achievement: (none yet)";
    this.data.lastGlobalAchievementText = "";
    this.data.lastGlobalAchievementId = "";
    this.data.streak = { count: 0, lastActiveKey: "", graceUsedAfterLastActive: false };
    this.data.aiPeakPastePct = 0;
    this.data.aiBestRecoveryPct = 0;
    this.data.activityHistory = {};
    this.saveDataStore();
    this.refreshView();
  }

  clearAllTodos(): void {
    for (const k of Object.keys(this.data.docs)) {
      const d = this.data.docs[k];
      d.todos = [];
      d.todoDraft = "";
    }
    this.saveDataStore();
    this.refreshView();
  }

  dismissGlobalAchievementBanner(): void {
    this.data.lastGlobalAchievementText = "";
    this.data.lastGlobalAchievementId = "";
    this.saveDataStore();
    this.refreshView();
  }

  getGlobalSummary(): string {
    const docs = Object.values(this.data.docs);
    const totalWords = docs.reduce((s, d) => s + d.words, 0);
    const bestQuality = docs.reduce((m, d) => Math.max(m, d.quality), 0);
    const deletedWords = docs.reduce((s, d) => s + d.deletedWords, 0);
    const typedWords = docs.reduce((s, d) => s + safeNum((d as Partial<DocState>).typedWords, 0), 0);
    const pastedWords = docs.reduce((s, d) => s + safeNum((d as Partial<DocState>).pastedWords, 0), 0);
    const aiRecoveryGlobal = typedWords + pastedWords > 0 ? Math.round((typedWords * 100) / (typedWords + pastedWords)) : 0;
    const totalPomodoroWorkSeconds = docs.reduce((s, d) => s + safeNum(d.pomodoroWorkSeconds, 0), 0);
    const h = Math.floor(totalPomodoroWorkSeconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((totalPomodoroWorkSeconds % 3600) / 60).toString().padStart(2, "0");
    return `Tracked docs: ${docs.length}\nTotal words: ${totalWords}\nGlobal XP: ${this.data.totalXp}\nBest quality: ${bestQuality}/100\nNinja score: ${deletedWords}\nPomodoro: ${h}:${m}\nStreak: ${this.data.streak.count} days`;
  }

  dayDiff(prevKey: string, nextKey: string): number {
    const p = new Date(`${prevKey}T00:00:00`);
    const n = new Date(`${nextKey}T00:00:00`);
    return Math.floor((n.getTime() - p.getTime()) / 86400000);
  }

  rollOverDay(): void {
    const hadActivity = this.data.daily.pomodoroWorkSeconds >= 60;
    if (!this.data.activityHistory) this.data.activityHistory = {};
    if (hadActivity) {
      this.data.activityHistory[this.data.daily.key] = "done";
    }
    if (!this.data.streak.lastActiveKey) {
      if (hadActivity) {
        this.data.streak.count = 1;
        this.data.streak.lastActiveKey = this.data.daily.key;
        this.data.streak.graceUsedAfterLastActive = false;
      }
      return;
    }
    if (!hadActivity) return;
    const diff = this.dayDiff(this.data.streak.lastActiveKey, this.data.daily.key);
    if (diff <= 1) {
      this.data.streak.count += 1;
    } else if (diff === 2 && !this.data.streak.graceUsedAfterLastActive) {
      this.data.streak.count += 1;
      this.data.streak.graceUsedAfterLastActive = true;
      const prev = new Date(`${this.data.streak.lastActiveKey}T00:00:00`);
      const graceDay = new Date(prev.getTime() + 86400000);
      const graceKey = `${graceDay.getFullYear()}-${String(graceDay.getMonth() + 1).padStart(2, "0")}-${String(graceDay.getDate()).padStart(2, "0")}`;
      this.data.activityHistory[graceKey] = "grace";
    } else {
      this.data.streak.count = 1;
      this.data.streak.graceUsedAfterLastActive = false;
    }
    this.data.streak.lastActiveKey = this.data.daily.key;
  }

  getAchievementSummary(): string {
    return this.data.achievements.map((a) => `${a.unlocked ? "[Unlocked]" : "[Locked]"} ${a.title} - ${a.description}`).join("\n");
  }

  addTodo(filePath: string, text: string): void {
    const doc = this.data.docs[filePath];
    if (!doc) return;
    const clean = text.trim();
    if (!clean) return;
    doc.todos.push({
      id: `todo_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      text: clean,
      done: false,
      startWords: doc.words,
      startPomodoroWorkSeconds: doc.pomodoroWorkSeconds,
      awardedXp: 0
    });
    doc.todoDraft = "";
    this.saveDataStore();
    this.refreshView();
  }

  setTodoDraft(filePath: string, value: string): void {
    const doc = this.data.docs[filePath];
    if (!doc) return;
    doc.todoDraft = value;
    this.saveDataStore();
  }

  toggleTodo(filePath: string, todoId: string, done: boolean): void {
    const doc = this.data.docs[filePath];
    if (!doc) return;
    const t = doc.todos.find((x) => x.id === todoId);
    if (!t) return;
    t.done = done;
    if (done && t.awardedXp === 0) {
      const wordDelta = Math.max(0, doc.words - t.startWords);
      const timeDelta = Math.max(0, doc.pomodoroWorkSeconds - t.startPomodoroWorkSeconds);
      const bonus = Math.min(40, Math.floor(wordDelta / 20) + Math.floor(timeDelta / 300));
      const gained = 10 + bonus;
      t.awardedXp = gained;
      this.data.totalXp += gained;
      this.data.daily.xp += gained;
      this.data.lastAchievementText = `Task complete: ${t.text} (+${gained} XP)`;
    } else if (!done && t.awardedXp > 0) {
      // Revert previously granted XP when task is unchecked.
      const refund = t.awardedXp;
      this.data.totalXp = Math.max(0, this.data.totalXp - refund);
      this.data.daily.xp = Math.max(0, this.data.daily.xp - refund);
      t.awardedXp = 0;
    }
    this.saveDataStore();
    this.refreshView();
  }

  resetDailyStats(): void {
    this.data.daily = {
      key: dateKey(),
      starterMissionText: this.pickMotivationLine(0, true),
      words: 0,
      xp: 0,
      paragraphs: 0,
      sentences: 0,
      bestQuality: 0,
      pomodoroWorkSeconds: 0,
      workLoops: 0,
      ninjaScore: 0,
      typedWords: 0,
      pastedWords: 0,
      claimedDailyAchievements: []
    };
    this.saveDataStore();
    this.refreshView();
  }

  refreshView(): void {
    const active = document.activeElement as HTMLElement | null;
    if (active?.classList?.contains("eq-todo-input")) {
      return;
    }
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_ESSAY_QUEST)) {
      const view = leaf.view as EssayQuestView;
      view.render();
    }
  }

  isSectionCollapsed(id: string): boolean {
    return !!this.data.uiPrefs?.collapsed?.[id];
  }

  isSectionVisible(id: string): boolean {
    return this.data.uiPrefs?.visible?.[id] !== false;
  }

  toggleSection(id: string): void {
    if (!this.data.uiPrefs) return;
    this.data.uiPrefs.collapsed[id] = !this.data.uiPrefs.collapsed[id];
    this.saveDataStore();
    this.refreshView();
  }

  moveSection(id: string, dir: -1 | 1): void {
    if (!this.data.uiPrefs) return;
    const arr = this.data.uiPrefs.sectionOrder;
    const i = arr.indexOf(id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
    this.saveDataStore();
    this.refreshView();
  }

  setSectionVisible(id: string, visible: boolean): void {
    if (!this.data.uiPrefs) return;
    this.data.uiPrefs.visible[id] = visible;
    this.saveDataStore();
    this.refreshView();
  }
}

class EssayQuestView extends ItemView {
  plugin: EssayQuestPlugin;
  constructor(leaf: WorkspaceLeaf, plugin: EssayQuestPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return VIEW_TYPE_ESSAY_QUEST; }
  getDisplayText(): string { return "Essay Quest"; }
  getIcon(): string { return "sword"; }

  async onOpen(): Promise<void> {
    this.render();
  }

  levelProgress(xp: number): { inLevel: number; perLevel: number; pct: number } {
    const perLevel = 120;
    const inLevel = xp % perLevel;
    const pct = Math.max(0, Math.min(100, Math.floor((inLevel * 100) / perLevel)));
    return { inLevel, perLevel, pct };
  }

  fmtDuration(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  fmtDurationNoSeconds(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  dailyFocusScore(d: DailyState): number {
    const timeScore = Math.min(40, Math.floor(d.pomodoroWorkSeconds / 60));
    const outputScore = Math.min(35, Math.floor(d.words / 10));
    const loopScore = Math.min(15, d.workLoops * 3);
    const craftScore = Math.min(10, Math.floor(d.bestQuality / 10));
    return Math.max(0, Math.min(100, timeScore + outputScore + loopScore + craftScore));
  }

  dailyStartLabel(): string {
    const labels = [
      "Start",
      "Rock and stone",
      "Leeroy Jenkins",
      "No cap",
      "Locked in",
      "Gogogo",
      "EZ clap",
      "Send it",
      "Say less",
      "Cook it",
      "Go next"
    ];
    const key = dateKey();
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return labels[h % labels.length] ?? "Start";
  }

  starterMissionFromLine(line: string, daily: DailyState): { text: string; done: boolean } {
    const t = line.toLowerCase();
    if (t.includes("60 seconds")) return { text: line, done: daily.pomodoroWorkSeconds >= 60 };
    if (t.includes("3 bullet")) return { text: line, done: daily.paragraphs >= 1 || daily.words >= 18 };
    if (t.includes("2 lines")) return { text: line, done: daily.sentences >= 2 || daily.words >= 16 };
    if (t.includes("one bad sentence")) return { text: line, done: daily.sentences >= 1 || daily.words >= 8 };
    if (t.includes("first 2 lines")) return { text: line, done: daily.sentences >= 2 || daily.words >= 16 };
    if (t.includes("rough headline")) return { text: line, done: daily.words >= 10 };
    if (t.includes("one thing i know")) return { text: line, done: daily.words >= 12 };
    if (t.includes("today i will finish")) return { text: line, done: daily.words >= 10 };
    if (t.includes("start messy")) return { text: line, done: daily.words >= 12 };
    if (t.includes("the point of this section is")) return { text: line, done: daily.words >= 10 };
    // Fallback tiny action.
    return { text: line, done: daily.words >= 12 || daily.pomodoroWorkSeconds >= 60 };
  }

  dailyAchIcon(id: string): string {
    if (id.includes("focus")) return "⏱️";
    if (id.includes("words")) return "📝";
    if (id.includes("quality")) return "🏆";
    if (id.includes("ai")) return "🧠";
    return "✨";
  }

  renderWeekRow(target: HTMLElement): void {
    const days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now.getTime() - day * 86400000);
    const row = target.createEl("div", { cls: "eq-week-row" });
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const mark = this.plugin.data.activityHistory?.[key] ?? "";
      const isToday = key === dateKey();
      const bubble = row.createEl("div", { cls: `eq-week-bubble ${mark === "done" ? "is-done" : ""} ${mark === "grace" ? "is-grace" : ""} ${isToday ? "is-today" : ""}` });
      bubble.setText(days[i]);
      const focus = Math.max(0, Math.min(100, safeNum(this.plugin.data.focusHistory?.[key], 0)));
      if (focus > 0) {
        bubble.addClass("mod-tooltip");
        bubble.setAttr("aria-label", `Focus score: ${focus}%`);
      }
    }
  }

  achievementMetricIcon(id: string): string {
    if (id.includes("word")) return "📝";
    if (id.includes("quality")) return "🎯";
    if (id.includes("level")) return "🏅";
    if (id.includes("trim")) return "⚔️";
    if (id.includes("pomo")) return "⏱️";
    if (id.includes("streak")) return "🔥";
    if (id.includes("paragraph")) return "📚";
    if (id.includes("ai")) return "🤖";
    if (id.includes("wipeout")) return "🧹";
    return "✨";
  }

  render(): void {
    this.plugin.rollOverDayIfNeeded();
    const c = this.containerEl.children[1] as HTMLElement;
    c.empty();
    c.addClass("essay-quest-wrap");
    if (this.plugin.data.settings.animationsEnabled === false) c.addClass("eq-no-anim");

    const file = this.plugin.getActiveFile();
    const state = file ? this.plugin.data.docs[file.path] : null;
    const p = this.plugin.data.pomodoro;
    const remainingSafe = Math.max(0, safeNum(p.remainingSeconds, 0));
    const mm = Math.floor(remainingSafe / 60).toString().padStart(2, "0");
    const ss = (remainingSafe % 60).toString().padStart(2, "0");
    const phaseDuration = (p.workMode ? this.plugin.data.settings.workMinutes : this.plugin.data.settings.breakMinutes) * 60;
    const phasePct = Math.max(0, Math.min(100, Math.floor((remainingSafe * 100) / Math.max(1, phaseDuration))));

    c.createEl("div", { text: "Pomodoro:", cls: "eq-mode" });
    const timerRow = c.createEl("div", { cls: "eq-timer-row" });
    timerRow.createEl("div", { text: `${mm}:${ss}`, cls: "eq-timer" });
    const loops = Math.max(0, this.plugin.data.daily.workLoops);
    const phaseEl = timerRow.createEl("div", { text: `${p.workMode ? "Work" : "Break"} #${loops}`, cls: "eq-timer-phase" });
    if (loops >= 2) {
      const intensity = Math.min(6, loops);
      phaseEl.addClass(`eq-loop-size-${intensity}`);
      if (p.workMode && loops >= 4) phaseEl.addClass(`eq-loop-intensity-${intensity}`);
    }
    const pWrap = c.createEl("div", { cls: "eq-pomo-bar-wrap" });
    const pFill = pWrap.createEl("div", { cls: p.workMode ? "eq-pomo-bar-fill-work" : "eq-pomo-bar-fill-break" });
    pFill.style.width = `${phasePct}%`;
    const motivationEl = c.createEl("div", { cls: "eq-motivation", text: this.plugin.data.currentMotivationLine ?? "Keep going." });
    if (!p.running && this.plugin.data.settings.animationsEnabled !== false) motivationEl.addClass("eq-motivation-idle-wobble");

    const controls = c.createEl("div", { cls: "eq-row" });
    const startLabel = this.dailyStartLabel();
    const toggle = controls.createEl("button", { text: p.running ? "⏸︎ Pause" : `▶ ${startLabel}` });
    toggle.addClass("eq-pomo-toggle");
    toggle.onclick = async () => {
      this.plugin.data.pomodoro.running = !this.plugin.data.pomodoro.running;
      this.plugin.markUserActivity();
      await this.plugin.saveDataStore();
      this.render();
    };
    const reset = controls.createEl("button", { text: "↺ Reset" });
    reset.onclick = async () => {
      this.plugin.data.pomodoro.workMode = true;
      this.plugin.data.pomodoro.running = false;
      this.plugin.data.pomodoro.remainingSeconds = this.plugin.data.settings.workMinutes * 60;
      this.plugin.data.currentMotivationLine = this.plugin.pickMotivationLine(this.plugin.data.daily.workLoops, true);
      await this.plugin.saveDataStore();
      this.render();
    };


    const renderSection = (id: string, title: string, build: (target: HTMLElement) => void, collapsedPreview?: (target: HTMLElement) => void): void => {
      const wrap = c.createEl("div", { cls: "eq-box" });
      const head = wrap.createEl("div", { cls: "eq-section-head" });
      const left = head.createEl("button", { cls: "eq-section-toggle", text: `${this.plugin.isSectionCollapsed(id) ? "▶" : "▼"} ${title}` });
      left.onclick = () => this.plugin.toggleSection(id);
      if (this.plugin.isSectionCollapsed(id)) {
        if (collapsedPreview) {
          const body = wrap.createEl("div", { cls: "eq-section-body" });
          collapsedPreview(body);
        }
        return;
      }
      const body = wrap.createEl("div", { cls: "eq-section-body" });
      build(body);
    };

    const renderDocument = (): void => {
      renderSection("document", "Document Progress", (target) => {
        if (!state) {
          target.createEl("div", { cls: "eq-stat", text: "Open a markdown note to begin." });
          return;
        }
        target.createEl("div", { cls: "eq-stat", text: `🏅 Level: ${state.level}` });
        target.createEl("div", { cls: "eq-stat", text: `🎯 Quality: ${state.quality}/100` });
        target.createEl("div", { cls: "eq-stat", text: `🧩 Formatting: ${safeNum(state.formattingQuality, 0)}/100` });
        target.createEl("div", { cls: "eq-stat", text: `📚 Paragraphs: ${state.paragraphs}` });
        target.createEl("div", { cls: "eq-stat", text: `💬 Sentences: ${state.sentences}` });
        target.createEl("div", { cls: "eq-stat", text: `⚔️ Ninja score: ${state.deletedWords}` });
        const written = safeNum(state.typedWords, 0);
        const pasted = safeNum(state.pastedWords, 0);
        const aiPct = written + pasted > 0 ? Math.round((pasted * 100) / (written + pasted)) : 0;
        target.createEl("div", { cls: "eq-stat", text: `🤖 Artificially intelligent: ${aiPct}%` });
        target.createEl("div", { cls: "eq-stat", text: `⏱️ Pomodoro: ${this.fmtDurationNoSeconds(safeNum(state.pomodoroWorkSeconds, 0))}` });
      });
    };

    const renderTodo = (): void => {
      renderSection("todo", "Per-Document ToDo", (target) => {
        if (!state || !file) {
          target.createEl("div", { cls: "eq-stat", text: "Open a document to use ToDo." });
          return;
        }
        const addRow = target.createEl("div", { cls: "eq-row" });
        const todoInput = addRow.createEl("input", { cls: "eq-todo-input" });
        todoInput.placeholder = "Add task for this document...";
        todoInput.value = state.todoDraft ?? "";
        todoInput.oninput = () => this.plugin.setTodoDraft(file.path, todoInput.value);
        const addBtn = addRow.createEl("button", { text: "Add" });
        addBtn.onclick = () => this.plugin.addTodo(file.path, todoInput.value);
        for (const t of state.todos) {
          const row = target.createEl("label", { cls: "eq-todo-row" });
          const cb = row.createEl("input");
          cb.type = "checkbox";
          cb.checked = t.done;
          cb.onchange = () => this.plugin.toggleTodo(file.path, t.id, cb.checked);
          const xpText = t.awardedXp > 0 ? ` (+${t.awardedXp} XP)` : "";
          row.createEl("span", { text: `${t.text}${xpText}` });
        }
      });
    };

    const renderDaily = (): void => {
      renderSection("daily", "Your Progress", (target) => {
        const daily = this.plugin.data.daily;
        const lv = this.levelProgress(this.plugin.data.totalXp);
        target.createEl("div", { cls: "eq-level-title", text: `Next Level Progress (${lv.inLevel}/${lv.perLevel})` });
        const barWrap = target.createEl("div", { cls: "eq-level-bar-wrap" });
        const bar = barWrap.createEl("div", { cls: "eq-level-bar-fill" });
        bar.style.width = `${lv.pct}%`;
        this.renderWeekRow(target);
        target.createEl("div", { cls: "eq-stat", text: `🔥 Streak: ${this.plugin.data.streak.count} days (1 miss grace)` });
        target.createEl("div", { cls: "eq-stat", text: `🌱 Words: ${daily.words}` });
        target.createEl("div", { cls: "eq-stat", text: `⚔️ Ninja score: ${daily.ninjaScore}` });
        const dailyTotal = Math.max(1, daily.typedWords + daily.pastedWords);
        const dailyRecovery = Math.round((daily.typedWords * 100) / dailyTotal);
        target.createEl("div", { cls: "eq-stat", text: `🤖 AI recovery: ${dailyRecovery}% human` });
        target.createEl("div", { cls: "eq-stat", text: `⏱️ Pomodoro: ${this.fmtDurationNoSeconds(safeNum(daily.pomodoroWorkSeconds, 0))}` });
      }, (target) => {
        const daily = this.plugin.data.daily;
        const fs = this.dailyFocusScore(daily);
        target.createEl("div", { cls: "eq-level-title", text: `🎯 Focus Score (${fs}/100)` });
        const bw = target.createEl("div", { cls: "eq-level-bar-wrap" });
        const bf = bw.createEl("div", { cls: "eq-level-bar-fill" });
        bf.style.width = `${Math.max(0, Math.min(100, fs))}%`;
        this.renderWeekRow(target);
      });
    };

    const renderGlobal = (): void => {
      renderSection("global", "Global Progress", (target) => {
        const docs = Object.values(this.plugin.data.docs);
        const totalWords = docs.reduce((s, d) => s + d.words, 0);
        const bestQuality = docs.reduce((m, d) => Math.max(m, d.quality), 0);
        const deletedWords = docs.reduce((s, d) => s + d.deletedWords, 0);
        const typedWords = docs.reduce((s, d) => s + safeNum((d as Partial<DocState>).typedWords, 0), 0);
        const pastedWords = docs.reduce((s, d) => s + safeNum((d as Partial<DocState>).pastedWords, 0), 0);
        const aiRecoveryPct = typedWords + pastedWords > 0 ? Math.round((typedWords * 100) / (typedWords + pastedWords)) : 0;
        const totalPomodoroWorkSeconds = docs.reduce((s, d) => s + safeNum(d.pomodoroWorkSeconds, 0), 0);
        const ph = Math.floor(totalPomodoroWorkSeconds / 3600).toString().padStart(2, "0");
        const pm = Math.floor((totalPomodoroWorkSeconds % 3600) / 60).toString().padStart(2, "0");
        const globalLevel = levelFromXp(this.plugin.data.totalXp);
        target.createEl("div", { cls: "eq-stat", text: `🏅 Level: ${globalLevel}` });
        target.createEl("div", { cls: "eq-stat", text: `⚡ XP: ${this.plugin.data.totalXp}` });
        target.createEl("div", { cls: "eq-stat", text: `📝 Total words: ${totalWords}` });
        target.createEl("div", { cls: "eq-stat", text: `🏆 Best quality: ${bestQuality}/100` });
        target.createEl("div", { cls: "eq-stat", text: `⚔️ Ninja score: ${deletedWords}` });
        target.createEl("div", { cls: "eq-stat", text: `🤖 AI recovery: ${aiRecoveryPct}% human` });
        target.createEl("div", { cls: "eq-stat", text: `⏱️ Pomodoro: ${ph}:${pm}` });
        target.createEl("div", { cls: "eq-stat", text: `🔥 Streak: ${this.plugin.data.streak.count} days` });
      });
    };

    const renderAchievements = (): void => {
      renderSection("achievements", "Daily quests", (target) => {
        const daily = this.plugin.data.daily;
        const starterId = "daily_starter_mission";
        const starterDone = daily.claimedDailyAchievements.includes(starterId);
        const starterText = this.plugin.data.daily.starterMissionText ?? "Write one short starter sentence.";
        const starter = this.starterMissionFromLine(starterText, daily);
        const starterMet = starter.done;
        const renderStarterRow = (): void => {
          const row = target.createEl("label", { cls: "eq-todo-row" });
          const cb = row.createEl("input");
          cb.type = "checkbox";
          cb.checked = starterDone || starterMet;
          cb.disabled = true;
          const suffix = starterDone || starterMet ? " (+8 XP claimed)" : " (+8 XP)";
          row.createEl("span", { text: `🚀 Starter Mission: ${starter.text}${suffix}` });
        };
        if (!starterDone) {
          renderStarterRow();
          if (starterMet) {
            daily.claimedDailyAchievements.push(starterId);
            this.plugin.data.daily.xp += 8;
            this.plugin.data.totalXp += 8;
            void this.plugin.saveDataStore();
          }
        }

        if (starterDone || starterMet) for (const a of DAILY_ACHIEVEMENTS) {
          const achieved = a.met(daily);
          const claimed = daily.claimedDailyAchievements.includes(a.id);
          const row = target.createEl("label", { cls: "eq-todo-row" });
          const cb = row.createEl("input");
          cb.type = "checkbox";
          cb.checked = achieved;
          cb.disabled = true;
          const suffix = ` (+${a.xp} XP)`;
          row.createEl("span", { text: `${this.dailyAchIcon(a.id)} ${a.title}${suffix}` });
        }
        if (starterDone || starterMet) {
          renderStarterRow();
        }
        if (this.plugin.data.lastGlobalAchievementText && this.plugin.data.lastGlobalAchievementText.trim().length > 0) {
          const banner = target.createEl("div", { cls: "eq-new-achievement", text: this.plugin.data.lastGlobalAchievementText });
          const achId = this.plugin.data.lastGlobalAchievementId ?? "";
          let ach = this.plugin.data.achievements.find((x) => x.id === achId);
          if (!ach) {
            const m = this.plugin.data.lastGlobalAchievementText.match(/New global achievement:\s*(.+)$/i);
            const title = m?.[1]?.trim() ?? "";
            if (title) ach = this.plugin.data.achievements.find((x) => x.title === title);
          }
          if (ach?.description) banner.title = ach.description;
          banner.onclick = () => this.plugin.dismissGlobalAchievementBanner();
        }
      });
    };

    for (const sectionId of this.plugin.data.uiPrefs?.sectionOrder ?? ["document", "todo", "daily", "achievements", "global"]) {
      if (!this.plugin.isSectionVisible(sectionId)) continue;
      if (sectionId === "document") renderDocument();
      if (sectionId === "todo") renderTodo();
      if (sectionId === "daily") renderDaily();
      if (sectionId === "achievements") renderAchievements();
      if (sectionId === "global") renderGlobal();
    }

    const footerRow = c.createEl("div", { cls: "eq-row" });
    const settingsBtn = footerRow.createEl("button", { text: "⚙ Stats and Achievements" });
    settingsBtn.onclick = () => new EssayQuestSettingsModal(this.app, this.plugin).open();

    c.oncontextmenu = (ev) => ev.preventDefault();
    return;
  }
}

class EssayQuestSettingsModal extends Modal {
  plugin: EssayQuestPlugin;
  showUngrouped = false;
  constructor(app: App, plugin: EssayQuestPlugin) {
    super(app);
    this.plugin = plugin;
  }

  renderWeekRow(target: HTMLElement): void {
    const days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now.getTime() - day * 86400000);
    const row = target.createEl("div", { cls: "eq-week-row" });
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const mark = this.plugin.data.activityHistory?.[key] ?? "";
      const isToday = key === dateKey();
      const bubble = row.createEl("div", { cls: `eq-week-bubble ${mark === "done" ? "is-done" : ""} ${mark === "grace" ? "is-grace" : ""} ${isToday ? "is-today" : ""}` });
      bubble.setText(mark === "done" ? `✓ ${days[i]}` : mark === "grace" ? `❄ ${days[i]}` : days[i]);
    }
  }

  renderGlobalFocusWeekRow(target: HTMLElement): void {
    const days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now.getTime() - day * 86400000);
    const row = target.createEl("div", { cls: "eq-week-row" });
    const todayKey = dateKey();
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const mark = this.plugin.data.activityHistory?.[key] ?? "";
      const isToday = key === todayKey;
      const bubble = row.createEl("div", { cls: `eq-week-bubble eq-week-focus ${mark === "done" ? "is-done" : ""} ${mark === "grace" ? "is-grace" : ""} ${isToday ? "is-today" : ""}` });
      const score = Math.max(0, Math.min(100, safeNum(this.plugin.data.focusHistory?.[key], 0)));
      const scoreText = score > 0 ? `${score}%` : "--";
      bubble.createEl("div", { cls: "eq-week-focus-score", text: scoreText });
      bubble.createEl("div", { cls: "eq-week-focus-day", text: days[i] });
      if (score > 0) {
        bubble.addClass("mod-tooltip");
        bubble.setAttr("aria-label", `Focus score: ${score}%`);
      }
    }
  }

  achievementProgress(a: Achievement, bestWords: number, bestParagraphs: number, bestQuality: number, level: number, totalDeleted: number, totalPomo: number, streak: number, aiPct: number): { pct: number; metric: string; icon: string; label: string } {
    const calc = (v: number, t: number): number => Math.max(0, Math.min(100, Math.floor((v * 100) / Math.max(1, t))));
    switch (a.id) {
      case "first100": return { pct: calc(bestWords, 100), metric: "words", icon: "📝", label: `${bestWords}/100 words` };
      case "word500": return { pct: calc(bestWords, 500), metric: "words", icon: "📝", label: `${bestWords}/500 words` };
      case "word1000": return { pct: calc(bestWords, 1000), metric: "words", icon: "📝", label: `${bestWords}/1000 words` };
      case "word2000": return { pct: calc(bestWords, 2000), metric: "words", icon: "📝", label: `${bestWords}/2000 words` };
      case "word5000": return { pct: calc(bestWords, 5000), metric: "words", icon: "📝", label: `${bestWords}/5000 words` };
      case "word10000": return { pct: calc(bestWords, 10000), metric: "words", icon: "📝", label: `${bestWords}/10000 words` };
      case "word20000": return { pct: calc(bestWords, 20000), metric: "words", icon: "📝", label: `${bestWords}/20000 words` };
      case "word50000": return { pct: calc(bestWords, 50000), metric: "words", icon: "📝", label: `${bestWords}/50000 words` };
      case "word100000": return { pct: calc(bestWords, 100000), metric: "words", icon: "📝", label: `${bestWords}/100000 words` };
      case "word200000": return { pct: calc(bestWords, 200000), metric: "words", icon: "📝", label: `${bestWords}/200000 words` };
      case "paragraph5": return { pct: calc(bestParagraphs, 5), metric: "paragraphs", icon: "📚", label: `${bestParagraphs}/5 paragraphs` };
      case "paragraph10": return { pct: calc(bestParagraphs, 10), metric: "paragraphs", icon: "📚", label: `${bestParagraphs}/10 paragraphs` };
      case "paragraph20": return { pct: calc(bestParagraphs, 20), metric: "paragraphs", icon: "📚", label: `${bestParagraphs}/20 paragraphs` };
      case "paragraph40": return { pct: calc(bestParagraphs, 40), metric: "paragraphs", icon: "📚", label: `${bestParagraphs}/40 paragraphs` };
      case "paragraph100": return { pct: calc(bestParagraphs, 100), metric: "paragraphs", icon: "📚", label: `${bestParagraphs}/100 paragraphs` };
      case "paragraph200": return { pct: calc(bestParagraphs, 200), metric: "paragraphs", icon: "📚", label: `${bestParagraphs}/200 paragraphs` };
      case "paragraph500": return { pct: calc(bestParagraphs, 500), metric: "paragraphs", icon: "📚", label: `${bestParagraphs}/500 paragraphs` };
      case "paragraph1000": return { pct: calc(bestParagraphs, 1000), metric: "paragraphs", icon: "📚", label: `${bestParagraphs}/1000 paragraphs` };
      case "quality80": return { pct: calc(bestQuality, 80), metric: "quality", icon: "🎯", label: `${bestQuality}/80 quality` };
      case "quality85": return { pct: calc(bestQuality, 85), metric: "quality", icon: "🎯", label: `${bestQuality}/85 quality` };
      case "quality90": return { pct: calc(bestQuality, 90), metric: "quality", icon: "🎯", label: `${bestQuality}/90 quality` };
      case "quality95": return { pct: calc(bestQuality, 95), metric: "quality", icon: "🎯", label: `${bestQuality}/95 quality` };
      case "level5": return { pct: calc(level, 5), metric: "level", icon: "🏅", label: `${level}/5 level` };
      case "level20": return { pct: calc(level, 20), metric: "level", icon: "🏅", label: `${level}/20 level` };
      case "level100": return { pct: calc(level, 100), metric: "level", icon: "🏅", label: `${level}/100 level` };
      case "level1000": return { pct: calc(level, 1000), metric: "level", icon: "🏅", label: `${level}/1000 level` };
      case "trim50": return { pct: calc(totalDeleted, 50), metric: "ninja", icon: "⚔️", label: `${totalDeleted}/50 ninja` };
      case "trim200": return { pct: calc(totalDeleted, 200), metric: "ninja", icon: "⚔️", label: `${totalDeleted}/200 ninja` };
      case "trim500": return { pct: calc(totalDeleted, 500), metric: "ninja", icon: "⚔️", label: `${totalDeleted}/500 ninja` };
      case "trim1000": return { pct: calc(totalDeleted, 1000), metric: "ninja", icon: "⚔️", label: `${totalDeleted}/1000 ninja` };
      case "trim2000": return { pct: calc(totalDeleted, 2000), metric: "ninja", icon: "⚔️", label: `${totalDeleted}/2000 ninja` };
      case "trim5000": return { pct: calc(totalDeleted, 5000), metric: "ninja", icon: "⚔️", label: `${totalDeleted}/5000 ninja` };
      case "trim10000": return { pct: calc(totalDeleted, 10000), metric: "ninja", icon: "⚔️", label: `${totalDeleted}/10000 ninja` };
      case "pomo1h": return { pct: calc(totalPomo, 3600), metric: "pomodoro", icon: "⏱️", label: `${Math.floor(totalPomo / 60)}/60 min` };
      case "pomo5h": return { pct: calc(totalPomo, 18000), metric: "pomodoro", icon: "⏱️", label: `${Math.floor(totalPomo / 60)}/300 min` };
      case "pomo20h": return { pct: calc(totalPomo, 72000), metric: "pomodoro", icon: "⏱️", label: `${Math.floor(totalPomo / 60)}/1200 min` };
      case "pomo50h": return { pct: calc(totalPomo, 180000), metric: "pomodoro", icon: "⏱️", label: `${Math.floor(totalPomo / 60)}/3000 min` };
      case "pomo100h": return { pct: calc(totalPomo, 360000), metric: "pomodoro", icon: "⏱️", label: `${Math.floor(totalPomo / 60)}/6000 min` };
      case "pomo200h": return { pct: calc(totalPomo, 720000), metric: "pomodoro", icon: "⏱️", label: `${Math.floor(totalPomo / 60)}/12000 min` };
      case "pomo500h": return { pct: calc(totalPomo, 1800000), metric: "pomodoro", icon: "⏱️", label: `${Math.floor(totalPomo / 60)}/30000 min` };
      case "pomo1000h": return { pct: calc(totalPomo, 3600000), metric: "pomodoro", icon: "⏱️", label: `${Math.floor(totalPomo / 60)}/60000 min` };
      case "streak3": return { pct: calc(streak, 3), metric: "streak", icon: "🔥", label: `${streak}/3 streak` };
      case "streak7": return { pct: calc(streak, 7), metric: "streak", icon: "🔥", label: `${streak}/7 streak` };
      case "streak30": return { pct: calc(streak, 30), metric: "streak", icon: "🔥", label: `${streak}/30 streak` };
      case "streak90": return { pct: calc(streak, 90), metric: "streak", icon: "🔥", label: `${streak}/90 streak` };
      case "streak180": return { pct: calc(streak, 180), metric: "streak", icon: "🔥", label: `${streak}/180 streak` };
      case "streak365": return { pct: calc(streak, 365), metric: "streak", icon: "🔥", label: `${streak}/365 streak` };
      case "streak730": return { pct: calc(streak, 730), metric: "streak", icon: "🔥", label: `${streak}/730 streak` };
      case "streak1825": return { pct: calc(streak, 1825), metric: "streak", icon: "🔥", label: `${streak}/1825 streak` };
      case "ai25": return { pct: calc(safeNum(this.plugin.data.aiBestRecoveryPct, 0), 10), metric: "ai_recovery", icon: "🤖", label: `${Math.round(safeNum(this.plugin.data.aiBestRecoveryPct, 0))}/10 recovered` };
      case "ai50": return { pct: calc(safeNum(this.plugin.data.aiBestRecoveryPct, 0), 25), metric: "ai_recovery", icon: "🤖", label: `${Math.round(safeNum(this.plugin.data.aiBestRecoveryPct, 0))}/25 recovered` };
      case "ai75": return { pct: calc(safeNum(this.plugin.data.aiBestRecoveryPct, 0), 50), metric: "ai_recovery", icon: "🤖", label: `${Math.round(safeNum(this.plugin.data.aiBestRecoveryPct, 0))}/50 recovered` };
      case "ai100": return { pct: calc(aiPct, 100), metric: "easter", icon: "🤖", label: `${aiPct}/100 pasted` };
      case "wipeout": return { pct: 0, metric: "easter", icon: "🧹", label: "Hidden easter egg" };
    }
    return {
      pct: a.unlocked ? 100 : 0,
      metric: a.group ?? "misc",
      icon: "✨",
      label: a.unlocked ? "completed" : "pending"
    };
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Essay Quest Panel" });
    contentEl.createEl("p", { text: "Configure timer and module organization in Obsidian Settings > Essay Quest." });

    contentEl.createEl("h4", { text: "Global Progress" });
    const docs = Object.values(this.plugin.data.docs);
    const totalWords = docs.reduce((s, d) => s + d.words, 0);
    const bestQuality = docs.reduce((m, d) => Math.max(m, d.quality), 0);
    const deletedWords = docs.reduce((s, d) => s + d.deletedWords, 0);
    const typedWords = docs.reduce((s, d) => s + safeNum((d as Partial<DocState>).typedWords, 0), 0);
    const pastedWords = docs.reduce((s, d) => s + safeNum((d as Partial<DocState>).pastedWords, 0), 0);
    const aiRecoveryGlobal = typedWords + pastedWords > 0 ? Math.round((typedWords * 100) / (typedWords + pastedWords)) : 0;
    const totalPomodoroWorkSeconds = docs.reduce((s, d) => s + safeNum(d.pomodoroWorkSeconds, 0), 0);
    const ph = Math.floor(totalPomodoroWorkSeconds / 3600).toString().padStart(2, "0");
    const pm = Math.floor((totalPomodoroWorkSeconds % 3600) / 60).toString().padStart(2, "0");
    const globalLevel = levelFromXp(this.plugin.data.totalXp);
    const globalBox = contentEl.createEl("div");
    globalBox.createEl("div", { text: `🏅 Level: ${globalLevel}` });
    globalBox.createEl("div", { text: `⚡ XP: ${this.plugin.data.totalXp}` });
    globalBox.createEl("div", { text: `📝 Total words: ${totalWords}` });
    globalBox.createEl("div", { text: `🏆 Best quality: ${bestQuality}/100` });
    globalBox.createEl("div", { text: `⚔️ Ninja score: ${deletedWords}` });
    globalBox.createEl("div", { text: `🤖 AI recovery: ${aiRecoveryGlobal}% human` });
    globalBox.createEl("div", { text: `⏱️ Pomodoro: ${ph}:${pm}` });
    globalBox.createEl("div", { text: `🔥 Streak: ${this.plugin.data.streak.count} days` });
    this.renderGlobalFocusWeekRow(globalBox);

    contentEl.createEl("h4", { text: "Achievements" });
    const bestWords = docs.reduce((m, d) => Math.max(m, d.words), 0);
    const bestParagraphs = docs.reduce((m, d) => Math.max(m, d.paragraphs), 0);
    const level = levelFromXp(this.plugin.data.totalXp);
    const totalPomo = totalPomodoroWorkSeconds;
    const streak = this.plugin.data.streak.count;
    const typedTotal = docs.reduce((s, d) => s + safeNum((d as Partial<DocState>).typedWords, 0), 0);
    const pastedTotal = docs.reduce((s, d) => s + safeNum((d as Partial<DocState>).pastedWords, 0), 0);
    const aiPct = typedTotal + pastedTotal > 0 ? Math.round((pastedTotal * 100) / (typedTotal + pastedTotal)) : 0;
    const all = [...this.plugin.data.achievements];
    all.sort((a, b) => Number(a.unlocked) - Number(b.unlocked));

    let un: Array<{ a: Achievement; p: { pct: number; metric: string; icon: string; label: string } }> = [];
    try {
      un = all
        .filter((a) => !a.unlocked && !a.hidden)
        .map((a) => ({ a, p: this.achievementProgress(a, bestWords, bestParagraphs, bestQuality, level, deletedWords, totalPomo, streak, aiPct) }));
    } catch (e) {
      contentEl.createEl("div", { text: `Achievements render fallback active: ${String(e)}` });
      un = [];
    }
    un.sort((x, y) => y.p.pct - x.p.pct);
    const seen = new Set<string>();
    const closest: Array<{ a: Achievement; p: { pct: number; metric: string; icon: string; label: string } }> = [];
    for (const item of un) {
      if (seen.has(item.p.metric)) continue;
      seen.add(item.p.metric);
      closest.push(item);
      if (closest.length >= 3) break;
    }

    if (closest.length > 0) {
      const cw = contentEl.createEl("div");
      for (const c of closest) {
        const row = cw.createEl("label", { cls: "eq-todo-row" });
        row.style.display = "flex";
        row.style.gap = "8px";
        row.style.alignItems = "center";
        row.style.margin = "4px 0";
        const cb = row.createEl("input");
        cb.type = "checkbox";
        cb.checked = c.a.unlocked;
        cb.disabled = true;
        row.createEl("span", { text: `${c.p.icon} ${c.a.title} (${c.p.label})` });
        const bw = cw.createEl("div");
        bw.style.width = "100%";
        bw.style.height = "10px";
        bw.style.borderRadius = "999px";
        bw.style.background = "var(--background-modifier-border)";
        bw.style.overflow = "hidden";
        bw.style.margin = "0 0 10px 0";
        const bf = bw.createEl("div");
        bf.style.height = "100%";
        bf.style.borderRadius = "999px";
        bf.style.background = "linear-gradient(90deg, #3ecf8e 0%, #6dd5ed 100%)";
        bf.style.width = `${c.p.pct}%`;
      }
    }

    const toggleWrap = contentEl.createEl("div");
    const toggleBtn = toggleWrap.createEl("button", { text: this.showUngrouped ? "Group achievements" : "Ungroup achievements" });
    toggleBtn.onclick = () => {
      this.showUngrouped = !this.showUngrouped;
      this.onOpen();
    };

    const achWrap = contentEl.createEl("div");
    achWrap.style.maxHeight = "280px";
    achWrap.style.overflowY = "auto";
    achWrap.style.paddingRight = "4px";
    const closestIds = new Set(closest.map((c) => c.a.id as string));
    let displayList = all.filter((x) => !closestIds.has(x.id) && (!x.hidden || x.unlocked));
    if (!this.showUngrouped) {
      const chosen = new Map<string, Achievement>();
      for (const a of displayList) {
        if (a.hidden && a.unlocked) {
          chosen.set(`${a.group ?? a.id}:${a.id}`, a);
          continue;
        }
        const g = a.group ?? a.id;
        if (!chosen.has(g)) chosen.set(g, a);
      }
      displayList = Array.from(chosen.values());
    }

    if (displayList.length === 0) {
      achWrap.createEl("div", { text: "No achievements to show in current grouping view." });
    }
    for (const a of displayList) {
      const p = this.achievementProgress(a, bestWords, bestParagraphs, bestQuality, level, deletedWords, totalPomo, streak, aiPct);
      const row = achWrap.createEl("label", { cls: "eq-todo-row" });
      row.style.display = "flex";
      row.style.gap = "8px";
      row.style.alignItems = "center";
      row.style.margin = "4px 0";
      const cb = row.createEl("input");
      cb.type = "checkbox";
      cb.checked = a.unlocked;
      cb.disabled = true;
      row.createEl("span", { text: `${p.icon} ${a.title} - ${a.description}` });
    }

    contentEl.createEl("h4", { text: "Resets" });
    new Setting(contentEl).setName("Reset all document progress (keep ToDo)").addButton((b) =>
      b.setButtonText("Reset").setWarning().onClick(() => {
        if (window.confirm("Reset all document stats (words/quality/ninja/pomodoro/xp levels) while keeping ToDo items?")) this.plugin.resetSession();
      })
    );
    new Setting(contentEl).setName("Reset daily stats").addButton((b) =>
      b.setButtonText("Reset").setWarning().onClick(() => {
        if (window.confirm("Reset daily stats for today?")) this.plugin.resetDailyStats();
      })
    );
    new Setting(contentEl).setName("Reset global XP + achievements (keep documents)").addButton((b) =>
      b.setButtonText("Reset").setWarning().onClick(() => {
        if (window.confirm("Reset global XP, streak, daily stats, and achievements while keeping document progress?")) this.plugin.resetGlobalProgress();
      })
    );
    new Setting(contentEl).setName("Clear all ToDo items").addButton((b) =>
      b.setButtonText("Clear ToDo").setWarning().onClick(() => {
        if (window.confirm("Clear all ToDo tasks in all tracked documents?")) this.plugin.clearAllTodos();
      })
    );
  }
}

class EssayQuestSettingsTab extends PluginSettingTab {
  plugin: EssayQuestPlugin;
  constructor(app: App, plugin: EssayQuestPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Essay Quest" });

    new Setting(containerEl)
      .setName("Work minutes")
      .setDesc("Pomodoro duration.")
      .addText((t) =>
        t.setValue(String(this.plugin.data.settings.workMinutes)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isNaN(n) && n >= 1 && n <= 240) {
            this.plugin.data.settings.workMinutes = n;
            await this.plugin.saveDataStore();
            this.plugin.refreshView();
          }
        })
      );

    new Setting(containerEl)
      .setName("Break minutes")
      .setDesc("Pomodoro break duration.")
      .addText((t) =>
        t.setValue(String(this.plugin.data.settings.breakMinutes)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isNaN(n) && n >= 1 && n <= 240) {
            this.plugin.data.settings.breakMinutes = n;
            await this.plugin.saveDataStore();
            this.plugin.refreshView();
          }
        })
      );

    new Setting(containerEl)
      .setName("Enable animations")
      .setDesc("Toggle all panel animations.")
      .addToggle((tg) =>
        tg.setValue(this.plugin.data.settings.animationsEnabled !== false).onChange(async (v) => {
          this.plugin.data.settings.animationsEnabled = v;
          await this.plugin.saveDataStore();
          this.plugin.refreshView();
        })
      );

    new Setting(containerEl)
      .setName("AFK auto-pause")
      .setDesc("Automatically pause pomodoro when no activity is detected.")
      .addToggle((tg) =>
        tg.setValue(this.plugin.data.settings.afkAutoPauseEnabled !== false).onChange(async (v) => {
          this.plugin.data.settings.afkAutoPauseEnabled = v;
          await this.plugin.saveDataStore();
        })
      );

    new Setting(containerEl)
      .setName("AFK pause minutes")
      .setDesc("Inactivity threshold before auto-pause.")
      .addText((t) =>
        t.setValue(String(this.plugin.data.settings.afkPauseMinutes)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isNaN(n) && n >= 1 && n <= 120) {
            this.plugin.data.settings.afkPauseMinutes = n;
            await this.plugin.saveDataStore();
          }
        })
      );

    containerEl.createEl("h3", { text: "Module Organization" });
    const labels: Record<string, string> = {
      document: "Document",
      todo: "ToDo",
      daily: "Daily",
      achievements: "Achievements",
      global: "Global"
    };

    for (const id of this.plugin.data.uiPrefs?.sectionOrder ?? ["document", "todo", "daily", "achievements", "global"]) {
      const s = new Setting(containerEl).setName(labels[id] ?? id).setDesc("Visibility, order, and default collapsed state.");
      s.addToggle((tg) =>
        tg.setValue(this.plugin.isSectionVisible(id)).onChange(async (v) => this.plugin.setSectionVisible(id, v))
      );
      s.addButton((b) =>
        b.setButtonText("Up").onClick(async () => {
          this.plugin.moveSection(id, -1);
          this.display();
        })
      );
      s.addButton((b) =>
        b.setButtonText("Down").onClick(async () => {
          this.plugin.moveSection(id, 1);
          this.display();
        })
      );
      s.addExtraButton((b) => {
        const isCollapsed = this.plugin.isSectionCollapsed(id);
        b.setIcon(isCollapsed ? "chevrons-right-left" : "chevrons-left-right");
        b.setTooltip(isCollapsed ? "Default: minimized" : "Default: expanded");
        b.onClick(() => {
          this.plugin.toggleSection(id);
          this.display();
        });
      });
    }

    containerEl.createEl("h3", { text: "Stat Guide" });
    containerEl.createEl("div", { text: "Words (Daily): New words added today (delta)." });
    containerEl.createEl("div", { text: "XP: Progress points from writing, ToDo completions, and daily achievements." });
    containerEl.createEl("div", { text: "Level: Derived from total XP (global progression)." });
    containerEl.createEl("div", { text: "Quality: Heuristic score from length, structure, transitions, and diversity." });
    containerEl.createEl("div", { text: "Formatting: Harder score based on variety + density of markdown structure (headings, emphasis, lists, quotes, links, code, tables)." });
    containerEl.createEl("div", { text: "Ninja score: Words removed during revision (editing effort)." });
    containerEl.createEl("div", { text: "AI recovery (%): Human-written share from total typed+pasted words; cut/paste rearranges are ignored." });
    containerEl.createEl("div", { text: "Pomodoro: Accumulated active focus time." });
    containerEl.createEl("div", { text: "Streak: Consecutive active days with one missed-day grace." });
  }
}




