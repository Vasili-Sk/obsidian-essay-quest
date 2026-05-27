import { ItemView, Menu, WorkspaceLeaf } from "obsidian";
import { DAILY_ACHIEVEMENTS, VIEW_TYPE_ESSAY_QUEST } from "../domain/config";
import { dateKey, levelFromXp, safeNum } from "../domain/metrics";
import { t } from "../i18n";
import type { DailyState, DocState } from "../domain/types";
import type EssayQuestPlugin from "../main";
import { EssayQuestSettingsModal } from "./settingsModal";

export class EssayQuestView extends ItemView {
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
    return Math.max(0, Math.min(100, Math.floor(d.pomodoroWorkSeconds / 15)));
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
    const days = [
      t("common.weekday.mo"),
      t("common.weekday.tu"),
      t("common.weekday.we"),
      t("common.weekday.th"),
      t("common.weekday.fr"),
      t("common.weekday.sa"),
      t("common.weekday.su")
    ];
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now.getTime() - day * 86400000);
    const row = target.createEl("div", { cls: "eq-week-row" });
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const focus = Math.max(0, Math.min(100, safeNum(this.plugin.data.focusHistory?.[key], 0)));
      const isActive = focus > 5;
      const isToday = key === dateKey();
      const isFuture = d.getTime() > now.getTime() + 86400000 / 2;
      const isMissed = !isActive && !isToday && !isFuture;
      const bubble = row.createEl("div", { cls: `eq-week-bubble ${isActive ? "is-done" : ""} ${isMissed ? "is-missed" : ""} ${isToday ? "is-today" : ""}` });
      bubble.setText(days[i]);
      if (focus > 0) {
        bubble.addClass("mod-tooltip");
        bubble.setAttr("aria-label", `Focus score: ${focus}%`);
      }
    }
  }

  achievementMetricIcon(id: string): string {
    if (id.includes("word")) return "📝";
    if (id.includes("quality")) return "🏆";
    if (id.includes("level")) return "🏅";
    if (id.includes("trim")) return "⚔️";
    if (id.includes("pomo")) return "⏱️";
    if (id.includes("streak")) return "🔥";
    if (id.includes("paragraph")) return "📚";
    if (id.includes("ai")) return "🧠";
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

    c.createEl("div", { text: t("dashboard.pomodoro"), cls: "eq-mode" });
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
    const motivationEl = c.createEl("div", { cls: "eq-motivation", text: this.plugin.getCurrentMotivationLine() });
    if (!p.running && this.plugin.data.settings.animationsEnabled !== false) motivationEl.addClass("eq-motivation-idle-wobble");

    const controls = c.createEl("div", { cls: "eq-row" });
    const startLabel = this.dailyStartLabel();
    const toggle = controls.createEl("button", { text: p.running ? t("dashboard.timer.pause") : t("dashboard.timer.start", { label: startLabel }) });
    toggle.addClass("eq-pomo-toggle");
    toggle.onclick = async () => {
      this.plugin.data.pomodoro.running = !this.plugin.data.pomodoro.running;
      this.plugin.markUserActivity();
      this.render();
    };
    const reset = controls.createEl("button", { text: t("dashboard.timer.reset") });
    reset.onclick = async () => {
      this.plugin.data.pomodoro.workMode = true;
      this.plugin.data.pomodoro.running = false;
      this.plugin.data.pomodoro.remainingSeconds = this.plugin.data.settings.workMinutes * 60;
      this.plugin.data.currentMotivationIndex = this.plugin.pickMotivationIndex(this.plugin.data.daily.workLoops, true);
      this.render();
    };


    const renderSection = (id: string, title: string, build: (target: HTMLElement) => void, collapsedPreview?: (target: HTMLElement) => void): void => {
      const wrap = c.createEl("div", { cls: "eq-box" });
      const head = wrap.createEl("div", { cls: "eq-section-head" });
      const left = head.createEl("button", { cls: "eq-section-toggle", text: `${this.plugin.isSectionCollapsed(id) ? t("dashboard.section.collapsed") : t("dashboard.section.expanded")} ${title}` });
      left.onclick = () => { void this.plugin.toggleSection(id); };
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
      renderSection("document", t("dashboard.document.title"), (target) => {
        if (!state) {
          target.createEl("div", { cls: "eq-stat", text: t("dashboard.document.empty") });
          return;
        }
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.document.level", { level: state.level }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.document.quality", { quality: state.quality }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.document.formatting", { formatting: safeNum(state.formattingQuality, 0) }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.document.paragraphs", { paragraphs: state.paragraphs }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.document.sentences", { sentences: state.sentences }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.document.ninja", { score: state.deletedWords }) });
        const written = safeNum(state.typedWords, 0);
        const pasted = safeNum(state.pastedWords, 0);
        const aiPct = written + pasted > 0 ? Math.round((pasted * 100) / (written + pasted)) : 0;
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.document.ai", { pct: aiPct }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.document.pomodoro", { time: this.fmtDurationNoSeconds(safeNum(state.pomodoroWorkSeconds, 0)) }) });
      });
    };

    const renderTodo = (): void => {
      const renderTodoItems = (target: HTMLElement, editable: boolean): void => {
        if (!state || !file) return;
        for (const todo of state.todos) {
          const row = target.createEl("label", { cls: "eq-todo-row" });
          if (editable) {
            row.oncontextmenu = (ev) => {
              ev.preventDefault();
              const menu = new Menu();
              menu.addItem((it) => it.setTitle(t("dashboard.todo.menu.up")).onClick(() => this.plugin.moveTodo(file.path, todo.id, -1)));
              menu.addItem((it) => it.setTitle(t("dashboard.todo.menu.down")).onClick(() => this.plugin.moveTodo(file.path, todo.id, 1)));
              menu.addItem((it) => it.setTitle(t("dashboard.todo.menu.delete")).onClick(() => this.plugin.deleteTodo(file.path, todo.id)));
              menu.showAtMouseEvent(ev);
            };
          }
          const cb = row.createEl("input");
          cb.type = "checkbox";
          cb.checked = todo.done;
          cb.onchange = () => this.plugin.toggleTodo(file.path, todo.id, cb.checked);
          const xpText = todo.awardedXp > 0 ? ` (+${todo.awardedXp} XP)` : "";
          row.createEl("span", { text: `${todo.text}${xpText}` });
        }
      };

      renderSection("todo", t("dashboard.todo.title"), (target) => {
        if (!state || !file) {
          target.createEl("div", { cls: "eq-stat", text: t("dashboard.todo.empty") });
          return;
        }
        const addRow = target.createEl("div", { cls: "eq-row" });
        const todoInput = addRow.createEl("input", { cls: "eq-todo-input" });
        todoInput.placeholder = t("dashboard.todo.placeholder");
        todoInput.value = state.todoDraft ?? "";
        todoInput.oninput = () => this.plugin.setTodoDraft(file.path, todoInput.value);
        const addBtn = addRow.createEl("button", { text: t("dashboard.todo.add") });
        addBtn.onclick = () => this.plugin.addTodo(file.path, todoInput.value);
        renderTodoItems(target, true);
      }, (target) => {
        if (!state || !file) {
          target.createEl("div", { cls: "eq-stat", text: t("dashboard.todo.empty") });
          return;
        }
        renderTodoItems(target, false);
      });
    };

    const renderDaily = (): void => {
      renderSection("daily", t("dashboard.daily.title"), (target) => {
        const daily = this.plugin.data.daily;
        const lv = this.levelProgress(this.plugin.data.totalXp);
        target.createEl("div", { cls: "eq-level-title", text: t("dashboard.daily.next_level", { inLevel: lv.inLevel, perLevel: lv.perLevel }) });
        const barWrap = target.createEl("div", { cls: "eq-level-bar-wrap" });
        const bar = barWrap.createEl("div", { cls: "eq-level-bar-fill" });
        bar.style.width = `${lv.pct}%`;
        this.renderWeekRow(target);
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.daily.streak", { days: this.plugin.data.streak.count }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.daily.words", { words: daily.words }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.daily.ninja", { score: daily.ninjaScore }) });
        const dailyTotal = Math.max(1, daily.typedWords + daily.pastedWords);
        const dailyRecovery = Math.round((daily.typedWords * 100) / dailyTotal);
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.daily.ai_recovery", { pct: dailyRecovery }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.daily.pomodoro", { time: this.fmtDurationNoSeconds(safeNum(daily.pomodoroWorkSeconds, 0)) }) });
      }, (target) => {
        const daily = this.plugin.data.daily;
        const fs = this.dailyFocusScore(daily);
        target.createEl("div", { cls: "eq-level-title", text: t("dashboard.daily.focus_score", { score: fs }) });
        const bw = target.createEl("div", { cls: "eq-level-bar-wrap" });
        const bf = bw.createEl("div", { cls: "eq-level-bar-fill" });
        bf.style.width = `${Math.max(0, Math.min(100, fs))}%`;
        this.renderWeekRow(target);
      });
    };

    const renderGlobal = (): void => {
      renderSection("global", t("dashboard.global.title"), (target) => {
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
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.global.level", { level: globalLevel }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.global.xp", { xp: this.plugin.data.totalXp }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.global.words", { words: totalWords }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.global.quality", { quality: bestQuality }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.global.ninja", { score: deletedWords }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.global.ai_recovery", { pct: aiRecoveryPct }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.global.pomodoro", { time: `${ph}:${pm}` }) });
        target.createEl("div", { cls: "eq-stat", text: t("dashboard.global.streak", { days: this.plugin.data.streak.count }) });
      });
    };

    const renderAchievements = (): void => {
      renderSection("achievements", t("dashboard.quests.title"), (target) => {
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
          row.createEl("span", { text: t("dashboard.quests.starter", { text: starter.text, suffix }) });
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
    const settingsBtn = footerRow.createEl("button", { text: t("dashboard.footer.settings") });
    settingsBtn.onclick = () => new EssayQuestSettingsModal(this.app, this.plugin).open();

    c.oncontextmenu = (ev) => ev.preventDefault();
    return;
  }
}









