import { App, Modal, Setting } from "obsidian";
import { DEFAULT_ACHIEVEMENTS } from "../domain/config";
import { dateKey, levelFromXp, safeNum } from "../domain/metrics";
import { t } from "../i18n";
import type { Achievement, DocState } from "../domain/types";
import type EssayQuestPlugin from "../main";

export class EssayQuestSettingsModal extends Modal {
  plugin: EssayQuestPlugin;
  showUngrouped = false;
  constructor(app: App, plugin: EssayQuestPlugin) {
    super(app);
    this.plugin = plugin;
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
      bubble.setText(isActive ? `✓ ${days[i]}` : days[i]);
    }
  }

  renderGlobalFocusWeekRow(target: HTMLElement): void {
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
    const todayKey = dateKey();
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const focus = Math.max(0, Math.min(100, safeNum(this.plugin.data.focusHistory?.[key], 0)));
      const isActive = focus > 5;
      const isToday = key === todayKey;
      const isFuture = d.getTime() > now.getTime() + 86400000 / 2;
      const isMissed = !isActive && !isToday && !isFuture;
      const bubble = row.createEl("div", { cls: `eq-week-bubble eq-week-focus ${isActive ? "is-done" : ""} ${isMissed ? "is-missed" : ""} ${isToday ? "is-today" : ""}` });
      const scoreText = focus > 0 ? `${focus}%` : "--";
      bubble.createEl("div", { cls: "eq-week-focus-score", text: scoreText });
      bubble.createEl("div", { cls: "eq-week-focus-day", text: days[i] });
      if (focus > 0) {
        bubble.addClass("mod-tooltip");
        bubble.setAttr("aria-label", `Focus score: ${focus}%`);
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
    contentEl.createEl("h3", { text: t("ach.modal.title") });
    contentEl.createEl("p", { text: t("ach.modal.desc") });

    contentEl.createEl("h4", { text: t("ach.global.title") });
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

    contentEl.createEl("h4", { text: t("ach.achievements.title") });
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
      contentEl.createEl("div", { text: t("ach.fallback", { error: String(e) }) });
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
    const toggleBtn = toggleWrap.createEl("button", { text: this.showUngrouped ? t("ach.toggle.group") : t("ach.toggle.ungroup") });
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
      achWrap.createEl("div", { text: t("ach.empty") });
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

    contentEl.createEl("h4", { text: t("ach.resets.title") });
    new Setting(contentEl).setName(t("ach.reset.session.name")).addButton((b) =>
      b.setButtonText(t("ach.button.reset")).setWarning().onClick(() => {
        if (window.confirm(t("ach.confirm.session"))) this.plugin.resetSession();
      })
    );
    new Setting(contentEl).setName(t("ach.reset.daily.name")).addButton((b) =>
      b.setButtonText(t("ach.button.reset")).setWarning().onClick(() => {
        if (window.confirm(t("ach.confirm.daily"))) this.plugin.resetDailyStats();
      })
    );
    new Setting(contentEl).setName(t("ach.reset.global.name")).addButton((b) =>
      b.setButtonText(t("ach.button.reset")).setWarning().onClick(() => {
        if (window.confirm(t("ach.confirm.global"))) this.plugin.resetGlobalProgress();
      })
    );
    new Setting(contentEl).setName(t("ach.reset.todo.name")).addButton((b) =>
      b.setButtonText(t("ach.button.clear_todo")).setWarning().onClick(() => {
        if (window.confirm(t("ach.confirm.todo"))) this.plugin.clearCurrentDocTodos();
      })
    );
  }
}








