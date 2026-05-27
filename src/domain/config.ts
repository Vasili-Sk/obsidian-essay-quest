import type { Achievement, DailyAchievementDef, EssayQuestSettings } from "./types";

export const VIEW_TYPE_ESSAY_QUEST = "essay-quest-dashboard";

export const DEFAULT_SETTINGS: EssayQuestSettings = {
  workMinutes: 25,
  breakMinutes: 5,
  autoRefreshMs: 900,
  animationsEnabled: true,
  afkAutoPauseEnabled: true,
  afkPauseMinutes: 15,
  localeMode: "auto"
};

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
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

export const DAILY_ACHIEVEMENTS: DailyAchievementDef[] = [
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
