import {
  App,
  ItemView,
  MarkdownView,
  Modal,
  Menu,
  PluginSettingTab,
  Notice,
  Plugin,
  Setting,
  TFile,
  WorkspaceLeaf
} from "obsidian";

import {
  VIEW_TYPE_ESSAY_QUEST,
  DEFAULT_SETTINGS,
  DEFAULT_ACHIEVEMENTS,
  DAILY_ACHIEVEMENTS
} from "./domain/config";
import {
  dateKey,
  countWords,
  countParagraphs,
  countSentences,
  qualityScore,
  formattingQualityScore,
  levelFromXp,
  safeNum
} from "./domain/metrics";
import { initI18n, t } from "./i18n";
import type {
  Achievement,
  AchievementId,
  DailyAchievementDef,
  DailyState,
  DocState,
  EssayQuestData,
  EssayQuestSettings,
  PomodoroState,
  StreakState,
  TodoItem
} from "./domain/types";
import { EssayQuestView } from "./ui/dashboardView";
import { EssayQuestSettingsTab } from "./ui/settingsTab";
export default class EssayQuestPlugin extends Plugin {
  data!: EssayQuestData;
  pomodoroIntervalId: number | null = null;
  refreshDebounceId: number | null = null;
  lastUserActivityTs = Date.now();
  readonly motivationTierCount = 5;
  readonly motivationTierSize = 10;

  async onload(): Promise<void> {
    await this.loadDataStore();
    this.refreshI18n();
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
      updatedAt: Date.now(),
      settings: { ...DEFAULT_SETTINGS },
      totalXp: 0,
      docs: {},
      achievements: DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a })),
      lastAchievementText: "New achievement: (none yet)",
      lastGlobalAchievementText: "",
      completedAchievementIds: [],
      daily: { key: dateKey(), starterMissionText: "Write one bad sentence on purpose, then improve it.", words: 0, xp: 0, paragraphs: 0, sentences: 0, bestQuality: 0, pomodoroWorkSeconds: 0, workLoops: 0, ninjaScore: 0, typedWords: 0, pastedWords: 0, claimedDailyAchievements: [] },
      streak: { count: 0, lastActiveKey: "", graceUsedAfterLastActive: false },
      aiPeakPastePct: 0,
      aiBestRecoveryPct: 0,
      currentMotivationIndex: 0,
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
    if (
      this.data.settings.localeMode !== "en"
      && this.data.settings.localeMode !== "ru"
      && this.data.settings.localeMode !== "es"
      && this.data.settings.localeMode !== "de"
      && this.data.settings.localeMode !== "auto"
    ) {
      this.data.settings.localeMode = "auto";
    }
    this.data.totalXp = Math.max(0, safeNum(this.data.totalXp, 0));
    if (!this.data.daily || this.data.daily.key !== dateKey()) {
      this.data.daily = { key: dateKey(), starterMissionText: this.pickMotivationLine(0, true), words: 0, xp: 0, paragraphs: 0, sentences: 0, bestQuality: 0, pomodoroWorkSeconds: 0, workLoops: 0, ninjaScore: 0, typedWords: 0, pastedWords: 0, claimedDailyAchievements: [] };
    }
    if (!this.data.streak) this.data.streak = { count: 0, lastActiveKey: "", graceUsedAfterLastActive: false };
    this.data.aiPeakPastePct = Math.max(0, Math.min(100, safeNum(this.data.aiPeakPastePct, 0)));
    this.data.aiBestRecoveryPct = Math.max(0, Math.min(100, safeNum(this.data.aiBestRecoveryPct, 0)));
    delete (this.data as Partial<EssayQuestData> & { currentMotivationLine?: string }).currentMotivationLine;
    this.data.currentMotivationIndex = this.safeMotivationIndex((this.data as Partial<EssayQuestData>).currentMotivationIndex);
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
    if (!Array.isArray(this.data.completedAchievementIds)) this.data.completedAchievementIds = [];
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
    // Timer state is intentionally not persisted across app restarts/wake.
    this.data.pomodoro.workMode = true;
    this.data.pomodoro.running = false;
    this.data.pomodoro.remainingSeconds = this.data.settings.workMinutes * 60;
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
        awardedXp: Math.max(0, safeNum(t.awardedXp, 0))
      }));
      d.deletedTodoIds = Array.isArray((d as Partial<DocState>).deletedTodoIds)
        ? ((d as Partial<DocState>).deletedTodoIds as unknown[]).map((x) => String(x))
        : [];
      d.todoDraft = typeof d.todoDraft === "string" ? d.todoDraft : "";
      d.todoBaselineWords = Math.max(0, safeNum((d as Partial<DocState>).todoBaselineWords, d.words));
      d.todoBaselinePomodoroWorkSeconds = Math.max(0, safeNum((d as Partial<DocState>).todoBaselinePomodoroWorkSeconds, d.pomodoroWorkSeconds));
    }
    if (!this.data.updatedAt || !Number.isFinite(this.data.updatedAt)) this.data.updatedAt = Date.now();
  }

  mergeAchievementsFromDefaults(): void {
    const completed = new Set<AchievementId>(this.data.completedAchievementIds ?? []);
    const existing = new Map<string, Achievement>();
    for (const a of this.data.achievements ?? []) {
      existing.set(a.id, a);
      if (a.unlocked) completed.add(a.id);
    }
    const merged: Achievement[] = [];
    for (const def of DEFAULT_ACHIEVEMENTS) {
      merged.push({ ...def, unlocked: completed.has(def.id) });
    }
    this.data.completedAchievementIds = Array.from(completed);
    this.data.achievements = merged;
  }

  mergeTodoLists(localTodos: TodoItem[], diskTodos: TodoItem[], deletedIds: Set<string>): TodoItem[] {
    const byId = new Map<string, TodoItem>();
    for (const t of diskTodos) {
      if (!deletedIds.has(t.id)) byId.set(t.id, { ...t });
    }
    for (const t of localTodos) {
      if (deletedIds.has(t.id)) continue;
      const old = byId.get(t.id);
      if (!old) {
        byId.set(t.id, { ...t });
        continue;
      }
      byId.set(t.id, {
        ...old,
        ...t,
        done: old.done || t.done,
        awardedXp: Math.max(safeNum(old.awardedXp, 0), safeNum(t.awardedXp, 0))
      });
    }
    return Array.from(byId.values());
  }

  mergeStoreWithDisk(local: EssayQuestData, disk: EssayQuestData): EssayQuestData {
    const merged: EssayQuestData = { ...disk, ...local };
    merged.settings = { ...disk.settings, ...local.settings };
    merged.totalXp = Math.max(safeNum(disk.totalXp, 0), safeNum(local.totalXp, 0));
    merged.aiPeakPastePct = Math.max(safeNum(disk.aiPeakPastePct, 0), safeNum(local.aiPeakPastePct, 0));
    merged.aiBestRecoveryPct = Math.max(safeNum(disk.aiBestRecoveryPct, 0), safeNum(local.aiBestRecoveryPct, 0));
    const completedSet = new Set<AchievementId>();
    for (const id of disk.completedAchievementIds ?? []) completedSet.add(id);
    for (const id of local.completedAchievementIds ?? []) completedSet.add(id);
    for (const a of disk.achievements ?? []) if (a.unlocked) completedSet.add(a.id);
    for (const a of local.achievements ?? []) if (a.unlocked) completedSet.add(a.id);
    merged.completedAchievementIds = Array.from(completedSet);

    merged.achievements = DEFAULT_ACHIEVEMENTS.map((def) => {
      const da = disk.achievements?.find((a) => a.id === def.id);
      const la = local.achievements?.find((a) => a.id === def.id);
      return { ...def, unlocked: !!(da?.unlocked || la?.unlocked || completedSet.has(def.id)) };
    });

    merged.docs = { ...disk.docs };
    for (const [path, ld] of Object.entries(local.docs ?? {})) {
      const dd = merged.docs[path];
      if (!dd) {
        merged.docs[path] = { ...ld, todos: [...(ld.todos ?? [])], deletedTodoIds: [...(ld.deletedTodoIds ?? [])] };
        continue;
      }
      const deletedIds = new Set<string>([...(dd.deletedTodoIds ?? []), ...(ld.deletedTodoIds ?? [])]);
      merged.docs[path] = {
        ...dd,
        ...ld,
        words: Math.max(safeNum(dd.words, 0), safeNum(ld.words, 0)),
        paragraphs: Math.max(safeNum(dd.paragraphs, 0), safeNum(ld.paragraphs, 0)),
        sentences: Math.max(safeNum(dd.sentences, 0), safeNum(ld.sentences, 0)),
        quality: Math.max(safeNum(dd.quality, 0), safeNum(ld.quality, 0)),
        formattingQuality: Math.max(safeNum(dd.formattingQuality, 0), safeNum(ld.formattingQuality, 0)),
        xp: Math.max(safeNum(dd.xp, 0), safeNum(ld.xp, 0)),
        level: Math.max(safeNum(dd.level, 1), safeNum(ld.level, 1)),
        deletedWords: Math.max(safeNum(dd.deletedWords, 0), safeNum(ld.deletedWords, 0)),
        typedWords: Math.max(safeNum(dd.typedWords, 0), safeNum(ld.typedWords, 0)),
        pastedWords: Math.max(safeNum(dd.pastedWords, 0), safeNum(ld.pastedWords, 0)),
        pomodoroWorkSeconds: Math.max(safeNum(dd.pomodoroWorkSeconds, 0), safeNum(ld.pomodoroWorkSeconds, 0)),
        todos: this.mergeTodoLists(ld.todos ?? [], dd.todos ?? [], deletedIds),
        deletedTodoIds: Array.from(deletedIds),
        todoBaselineWords: Math.max(safeNum((dd as Partial<DocState>).todoBaselineWords, 0), safeNum((ld as Partial<DocState>).todoBaselineWords, 0)),
        todoBaselinePomodoroWorkSeconds: Math.max(safeNum((dd as Partial<DocState>).todoBaselinePomodoroWorkSeconds, 0), safeNum((ld as Partial<DocState>).todoBaselinePomodoroWorkSeconds, 0))
      };
    }

    const localDaily = local.daily;
    const diskDaily = disk.daily;
    if (localDaily?.key === diskDaily?.key) {
      merged.daily = {
        ...diskDaily,
        ...localDaily,
        words: Math.max(safeNum(diskDaily.words, 0), safeNum(localDaily.words, 0)),
        xp: Math.max(safeNum(diskDaily.xp, 0), safeNum(localDaily.xp, 0)),
        paragraphs: Math.max(safeNum(diskDaily.paragraphs, 0), safeNum(localDaily.paragraphs, 0)),
        sentences: Math.max(safeNum(diskDaily.sentences, 0), safeNum(localDaily.sentences, 0)),
        bestQuality: Math.max(safeNum(diskDaily.bestQuality, 0), safeNum(localDaily.bestQuality, 0)),
        pomodoroWorkSeconds: Math.max(safeNum(diskDaily.pomodoroWorkSeconds, 0), safeNum(localDaily.pomodoroWorkSeconds, 0)),
        workLoops: Math.max(safeNum(diskDaily.workLoops, 0), safeNum(localDaily.workLoops, 0)),
        ninjaScore: Math.max(safeNum(diskDaily.ninjaScore, 0), safeNum(localDaily.ninjaScore, 0)),
        typedWords: Math.max(safeNum(diskDaily.typedWords, 0), safeNum(localDaily.typedWords, 0)),
        pastedWords: Math.max(safeNum(diskDaily.pastedWords, 0), safeNum(localDaily.pastedWords, 0)),
        claimedDailyAchievements: Array.from(new Set([...(diskDaily.claimedDailyAchievements ?? []), ...(localDaily.claimedDailyAchievements ?? [])]))
      };
    } else {
      merged.daily = localDaily?.key === dateKey()
        ? localDaily
        : (diskDaily ?? localDaily ?? {
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
        });
    }

    merged.streak = {
      ...disk.streak,
      ...local.streak,
      count: Math.max(safeNum(disk.streak?.count, 0), safeNum(local.streak?.count, 0))
    };

    merged.focusHistory = { ...(disk.focusHistory ?? {}), ...(local.focusHistory ?? {}) };
    merged.updatedAt = Date.now();
    return merged;
  }

  compactDataForSave(data: EssayQuestData): EssayQuestData {
    const completed = new Set<AchievementId>(data.completedAchievementIds ?? []);
    for (const a of data.achievements ?? []) {
      if (a.unlocked) completed.add(a.id);
    }
    const compact: EssayQuestData = {
      ...data,
      completedAchievementIds: Array.from(completed),
      achievements: DEFAULT_ACHIEVEMENTS
        .filter((d) => completed.has(d.id))
        .map((d) => ({ ...d, unlocked: true })),
      pomodoro: {
        running: false,
        workMode: true,
        remainingSeconds: data.settings.workMinutes * 60
      }
    };
    return compact;
  }

  async saveDataStore(): Promise<void> {
    const diskRaw = await this.loadData();
    if (diskRaw && typeof diskRaw === "object") {
      this.data = this.mergeStoreWithDisk(this.data, diskRaw as EssayQuestData);
    }
    this.data.updatedAt = Date.now();
    await this.saveData(this.compactDataForSave(this.data));
  }

  async saveDataStoreReplace(): Promise<void> {
    // Used for destructive/reset actions where local intent must win
    // and not be "restored" by max-merge reconciliation.
    this.data.updatedAt = Date.now();
    await this.saveData(this.compactDataForSave(this.data));
  }

  async prepareLatestBaseForReset(): Promise<void> {
    const diskRaw = await this.loadData();
    if (diskRaw && typeof diskRaw === "object") {
      this.data = this.mergeStoreWithDisk(this.data, diskRaw as EssayQuestData);
    }
  }

  cloneUiPrefs(): { sectionOrder: string[]; collapsed: Record<string, boolean>; visible: Record<string, boolean> } {
    return {
      sectionOrder: [...(this.data.uiPrefs?.sectionOrder ?? ["document", "todo", "daily", "achievements", "global"])],
      collapsed: { ...(this.data.uiPrefs?.collapsed ?? {}) },
      visible: { ...(this.data.uiPrefs?.visible ?? { document: true, todo: true, daily: true, achievements: true, global: false }) }
    };
  }

  async saveSettingsSnapshot(nextSettings: EssayQuestSettings): Promise<void> {
    const diskRaw = await this.loadData();
    let base = this.data;
    const localUpdatedAt = safeNum(this.data.updatedAt, 0);
    if (diskRaw && typeof diskRaw === "object") {
      const disk = diskRaw as EssayQuestData;
      const diskUpdatedAt = safeNum(disk.updatedAt, 0);
      base = diskUpdatedAt > localUpdatedAt ? disk : this.mergeStoreWithDisk(this.data, disk);
    }
    this.data = base;
    this.data.settings = { ...this.data.settings, ...nextSettings };
    this.data.pomodoro.running = false;
    this.data.pomodoro.workMode = true;
    this.data.pomodoro.remainingSeconds = this.data.settings.workMinutes * 60;
    this.data.updatedAt = Date.now();
    await this.saveData(this.compactDataForSave(this.data));
    this.refreshI18n();
  }

  async saveUiPrefsSnapshot(nextUiPrefs: { sectionOrder: string[]; collapsed: Record<string, boolean>; visible: Record<string, boolean> }): Promise<void> {
    const diskRaw = await this.loadData();
    let base = this.data;
    const localUpdatedAt = safeNum(this.data.updatedAt, 0);
    if (diskRaw && typeof diskRaw === "object") {
      const disk = diskRaw as EssayQuestData;
      const diskUpdatedAt = safeNum(disk.updatedAt, 0);
      base = diskUpdatedAt > localUpdatedAt ? disk : this.mergeStoreWithDisk(this.data, disk);
    }
    this.data = base;
    this.data.uiPrefs = {
      sectionOrder: [...nextUiPrefs.sectionOrder],
      collapsed: { ...nextUiPrefs.collapsed },
      visible: { ...nextUiPrefs.visible }
    };
    this.data.updatedAt = Date.now();
    await this.saveData(this.compactDataForSave(this.data));
  }

  getAppLocale(): string {
    const a = this.app as unknown as {
      i18n?: { locale?: string };
      vault?: { getConfig?: (key: string) => unknown };
    };
    const configured = a.vault?.getConfig?.("locale");
    const locale = a.i18n?.locale ?? (typeof configured === "string" ? configured : "") ?? "";
    if (locale && locale.trim().length > 0) return locale;
    return typeof navigator !== "undefined" ? navigator.language : "en";
  }

  refreshI18n(): void {
    initI18n(this.getAppLocale(), this.data.settings.localeMode ?? "auto");
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
        this.data.currentMotivationIndex = this.pickMotivationIndex(this.data.daily.workLoops, p.workMode);
        p.remainingSeconds = (p.workMode ? this.data.settings.workMinutes : this.data.settings.breakMinutes) * 60;
        new Notice(p.workMode ? "Break ended. Back to work." : "Work session done. Take a break.");
        this.playPomodoroSwitchSound(p.workMode);
      }
      this.updateTodayFocusHistory();
      if (phaseSwitched || p.remainingSeconds % 60 === 0) {
        await this.saveDataStore();
      }
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
      deletedTodoIds: [],
      todoDraft: "",
      todoBaselineWords: 0,
      todoBaselinePomodoroWorkSeconds: 0
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
      deletedTodoIds: prev.deletedTodoIds ?? [],
      todoDraft: typeof prev.todoDraft === "string" ? prev.todoDraft : "",
      todoBaselineWords: safeNum((prev as Partial<DocState>).todoBaselineWords, prev.words),
      todoBaselinePomodoroWorkSeconds: safeNum((prev as Partial<DocState>).todoBaselinePomodoroWorkSeconds, prev.pomodoroWorkSeconds)
    };

    // Daily is a delta tracker for writing activity, independent from XP gating.
    if (deltaWords > 0 && allowXpProgress) {
      this.data.daily.words += typedThisStep;
      this.data.daily.xp += xpGain;
      this.data.daily.typedWords += typedThisStep;
      this.data.daily.pastedWords += pastedThisStep;
      this.data.daily.paragraphs += Math.max(0, paragraphs - prev.paragraphs);
      this.data.daily.sentences += Math.max(0, sentences - prev.sentences);
      this.data.daily.bestQuality = Math.max(this.data.daily.bestQuality, quality);
    }
    if (effectiveDeletedThisStep > 0 && allowXpProgress) {
      this.data.daily.ninjaScore += effectiveDeletedThisStep;
    }
    this.updateTodayFocusHistory();

    this.unlockAchievements(this.data.docs[file.path], allowXpProgress, wasWipeout);
    this.applyDailyAchievementXp(allowXpProgress);
    this.updateTodayFocusHistory();
    this.refreshView();
  }

  applyDailyAchievementXp(allowProgress: boolean): void {
    if (!allowProgress) return;
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

  computeDailyFocusScore(d: DailyState): number {
    return Math.max(0, Math.min(100, Math.floor(d.pomodoroWorkSeconds / 15)));
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
    this.data.currentMotivationIndex = this.pickMotivationIndex(0, true);
  }

  safeMotivationIndex(index: number | undefined): number {
    const n = Math.floor(safeNum(index, 0));
    const max = this.motivationTierCount * this.motivationTierSize;
    if (n < 0 || n >= max) return 0;
    return n;
  }

  pickMotivationIndex(workLoops: number, workMode: boolean): number {
    void workMode;
    const tier = Math.max(0, Math.min(this.motivationTierCount - 1, Math.floor(workLoops)));
    const slot = Math.floor(Math.random() * this.motivationTierSize);
    return this.safeMotivationIndex(tier * this.motivationTierSize + slot);
  }

  motivationLineByIndex(index: number): string {
    const safeIndex = this.safeMotivationIndex(index);
    const tier = Math.floor(safeIndex / this.motivationTierSize);
    const slot = safeIndex % this.motivationTierSize;
    return t(`dashboard.motivation.t${tier}.${slot}`);
  }

  getCurrentMotivationLine(): string {
    const safeIndex = this.safeMotivationIndex(this.data.currentMotivationIndex);
    this.data.currentMotivationIndex = safeIndex;
    return this.motivationLineByIndex(safeIndex);
  }

  pickMotivationLine(workLoops: number, workMode: boolean): string {
    const idx = this.pickMotivationIndex(workLoops, workMode);
    this.data.currentMotivationIndex = idx;
    return this.motivationLineByIndex(idx);
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
        if (!this.data.completedAchievementIds) this.data.completedAchievementIds = [];
        if (!this.data.completedAchievementIds.includes(a.id)) this.data.completedAchievementIds.push(a.id);
        this.data.lastAchievementText = allow ? `New achievement: ${a.title} [during active pomodoro]` : `New achievement: ${a.title}`;
        this.data.lastGlobalAchievementText = `New global achievement: ${a.title}`;
        this.data.lastGlobalAchievementId = a.id;
      }
    }
  }

  async resetSession(): Promise<void> {
    await this.prepareLatestBaseForReset();
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
    await this.saveDataStoreReplace();
    this.refreshView();
  }

  async resetAchievements(): Promise<void> {
    await this.prepareLatestBaseForReset();
    this.data.achievements = DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a }));
    this.data.lastAchievementText = "New achievement: (none yet)";
    this.data.lastGlobalAchievementText = "";
    this.data.lastGlobalAchievementId = "";
    this.data.completedAchievementIds = [];
    await this.saveDataStoreReplace();
    this.refreshView();
  }

  async resetGlobalProgress(): Promise<void> {
    await this.prepareLatestBaseForReset();
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
    this.data.completedAchievementIds = [];
    await this.saveDataStoreReplace();
    this.refreshView();
  }

  async clearCurrentDocTodos(): Promise<void> {
    await this.prepareLatestBaseForReset();
    const active = this.getActiveFile();
    if (!active || active.extension !== "md") {
      new Notice("Open a markdown document to clear its ToDo list.");
      return;
    }
    const d = this.data.docs[active.path];
    if (!d) {
      new Notice("No tracked ToDo list found for this document.");
      return;
    }
    for (const t of d.todos) {
      if (!d.deletedTodoIds.includes(t.id)) d.deletedTodoIds.push(t.id);
    }
    d.todos = [];
    d.todoDraft = "";
    await this.saveDataStoreReplace();
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
    const hadActivity = Math.max(0, Math.min(100, safeNum(this.data.focusHistory?.[this.data.daily.key], 0))) > 5;
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
      awardedXp: 0
    });
    doc.todoBaselineWords = doc.words;
    doc.todoBaselinePomodoroWorkSeconds = doc.pomodoroWorkSeconds;
    doc.todoDraft = "";
    this.saveDataStore();
    this.refreshView();
  }

  setTodoDraft(filePath: string, value: string): void {
    const doc = this.data.docs[filePath];
    if (!doc) return;
    doc.todoDraft = value;
  }

  deleteTodo(filePath: string, todoId: string): void {
    const doc = this.data.docs[filePath];
    if (!doc) return;
    const idx = doc.todos.findIndex((x) => x.id === todoId);
    if (idx < 0) return;
    const t = doc.todos[idx];
    if (t.awardedXp > 0) {
      this.data.totalXp = Math.max(0, this.data.totalXp - t.awardedXp);
      this.data.daily.xp = Math.max(0, this.data.daily.xp - t.awardedXp);
    }
    doc.todos.splice(idx, 1);
    if (!doc.deletedTodoIds.includes(todoId)) doc.deletedTodoIds.push(todoId);
    this.saveDataStore();
    this.refreshView();
  }

  moveTodo(filePath: string, todoId: string, dir: -1 | 1): void {
    const doc = this.data.docs[filePath];
    if (!doc) return;
    const i = doc.todos.findIndex((x) => x.id === todoId);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= doc.todos.length) return;
    const tmp = doc.todos[i];
    doc.todos[i] = doc.todos[j];
    doc.todos[j] = tmp;
    this.saveDataStore();
    this.refreshView();
  }

  toggleTodo(filePath: string, todoId: string, done: boolean): void {
    const doc = this.data.docs[filePath];
    if (!doc) return;
    const t = doc.todos.find((x) => x.id === todoId);
    if (!t) return;
    t.done = done;
    if (done && t.awardedXp === 0) {
      const wordDelta = Math.max(0, doc.words - safeNum((doc as Partial<DocState>).todoBaselineWords, doc.words));
      const timeDelta = Math.max(0, doc.pomodoroWorkSeconds - safeNum((doc as Partial<DocState>).todoBaselinePomodoroWorkSeconds, doc.pomodoroWorkSeconds));
      const bonus = Math.min(40, Math.floor(wordDelta / 20) + Math.floor(timeDelta / 300));
      const gained = 10 + bonus;
      t.awardedXp = gained;
      this.data.totalXp += gained;
      this.data.daily.xp += gained;
      this.data.lastAchievementText = `Task complete: ${t.text} (+${gained} XP)`;
      doc.todoBaselineWords = doc.words;
      doc.todoBaselinePomodoroWorkSeconds = doc.pomodoroWorkSeconds;
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

  async resetDailyStats(): Promise<void> {
    await this.prepareLatestBaseForReset();
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
    await this.saveDataStoreReplace();
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

  async toggleSection(id: string): Promise<void> {
    if (!this.data.uiPrefs) return;
    this.data.uiPrefs.collapsed[id] = !this.data.uiPrefs.collapsed[id];
    await this.saveUiPrefsSnapshot(this.cloneUiPrefs());
    this.refreshView();
  }

  async moveSection(id: string, dir: -1 | 1): Promise<void> {
    if (!this.data.uiPrefs) return;
    const arr = this.data.uiPrefs.sectionOrder;
    const i = arr.indexOf(id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
    await this.saveUiPrefsSnapshot(this.cloneUiPrefs());
    this.refreshView();
  }

  async setSectionVisible(id: string, visible: boolean): Promise<void> {
    if (!this.data.uiPrefs) return;
    this.data.uiPrefs.visible[id] = visible;
    await this.saveUiPrefsSnapshot(this.cloneUiPrefs());
    this.refreshView();
  }
}




