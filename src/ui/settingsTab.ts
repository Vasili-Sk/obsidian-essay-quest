import { App, PluginSettingTab, Setting } from "obsidian";
import { t } from "../i18n";
import type EssayQuestPlugin from "../main";

export class EssayQuestSettingsTab extends PluginSettingTab {
  plugin: EssayQuestPlugin;
  constructor(app: App, plugin: EssayQuestPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: t("settings.title") });

    new Setting(containerEl)
      .setName(t("settings.work_minutes.name"))
      .setDesc(t("settings.work_minutes.desc"))
      .addText((tx) =>
        tx.setValue(String(this.plugin.data.settings.workMinutes)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isNaN(n) && n >= 1 && n <= 240) {
            this.plugin.data.settings.workMinutes = n;
            await this.plugin.saveSettingsSnapshot({ ...this.plugin.data.settings });
            this.plugin.refreshView();
          }
        })
      );

    new Setting(containerEl)
      .setName(t("settings.break_minutes.name"))
      .setDesc(t("settings.break_minutes.desc"))
      .addText((tx) =>
        tx.setValue(String(this.plugin.data.settings.breakMinutes)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isNaN(n) && n >= 1 && n <= 240) {
            this.plugin.data.settings.breakMinutes = n;
            await this.plugin.saveSettingsSnapshot({ ...this.plugin.data.settings });
            this.plugin.refreshView();
          }
        })
      );

    new Setting(containerEl)
      .setName(t("settings.animations.name"))
      .setDesc(t("settings.animations.desc"))
      .addToggle((tg) =>
        tg.setValue(this.plugin.data.settings.animationsEnabled !== false).onChange(async (v) => {
          this.plugin.data.settings.animationsEnabled = v;
          await this.plugin.saveSettingsSnapshot({ ...this.plugin.data.settings });
          this.plugin.refreshView();
        })
      );

    new Setting(containerEl)
      .setName(t("settings.afk.name"))
      .setDesc(t("settings.afk.desc"))
      .addToggle((tg) =>
        tg.setValue(this.plugin.data.settings.afkAutoPauseEnabled !== false).onChange(async (v) => {
          this.plugin.data.settings.afkAutoPauseEnabled = v;
          await this.plugin.saveSettingsSnapshot({ ...this.plugin.data.settings });
        })
      );

    new Setting(containerEl)
      .setName(t("settings.afk_minutes.name"))
      .setDesc(t("settings.afk_minutes.desc"))
      .addText((tx) =>
        tx.setValue(String(this.plugin.data.settings.afkPauseMinutes)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isNaN(n) && n >= 1 && n <= 120) {
            this.plugin.data.settings.afkPauseMinutes = n;
            await this.plugin.saveSettingsSnapshot({ ...this.plugin.data.settings });
          }
        })
      );

    new Setting(containerEl)
      .setName(t("settings.locale.name"))
      .setDesc(t("settings.locale.desc"))
      .addDropdown((dd) =>
        dd
          .addOption("auto", t("settings.locale.auto"))
          .addOption("en", t("settings.locale.en"))
          .addOption("ru", t("settings.locale.ru"))
          .addOption("es", t("settings.locale.es"))
          .addOption("de", t("settings.locale.de"))
          .setValue(this.plugin.data.settings.localeMode ?? "auto")
          .onChange(async (v) => {
            if (v === "auto" || v === "en" || v === "ru" || v === "es" || v === "de") {
              this.plugin.data.settings.localeMode = v;
              await this.plugin.saveSettingsSnapshot({ ...this.plugin.data.settings });
              this.plugin.refreshI18n();
              this.plugin.refreshView();
              this.display();
            }
          })
      );

    containerEl.createEl("h3", { text: t("settings.modules.title") });
    const labels: Record<string, string> = {
      document: "Document",
      todo: "ToDo",
      daily: "Daily",
      achievements: "Achievements",
      global: "Global"
    };

    for (const id of this.plugin.data.uiPrefs?.sectionOrder ?? ["document", "todo", "daily", "achievements", "global"]) {
      const s = new Setting(containerEl).setName(labels[id] ?? id).setDesc(t("settings.modules.desc"));
      s.addToggle((tg) =>
        tg.setValue(this.plugin.isSectionVisible(id)).onChange(async (v) => await this.plugin.setSectionVisible(id, v))
      );
      s.addButton((b) =>
        b.setButtonText(t("settings.button.up")).onClick(async () => {
          await this.plugin.moveSection(id, -1);
          this.redisplayKeepingScroll();
        })
      );
      s.addButton((b) =>
        b.setButtonText(t("settings.button.down")).onClick(async () => {
          await this.plugin.moveSection(id, 1);
          this.redisplayKeepingScroll();
        })
      );
      s.addExtraButton((b) => {
        const isCollapsed = this.plugin.isSectionCollapsed(id);
        b.setIcon(isCollapsed ? "chevrons-right-left" : "chevrons-left-right");
        b.setTooltip(isCollapsed ? "Default: minimized" : "Default: expanded");
        b.onClick(() => {
          void this.plugin.toggleSection(id);
          this.redisplayKeepingScroll();
        });
      });
    }

    containerEl.createEl("h3", { text: t("settings.stat_guide.title") });
    containerEl.createEl("div", { text: t("settings.stat.words") });
    containerEl.createEl("div", { text: t("settings.stat.xp") });
    containerEl.createEl("div", { text: t("settings.stat.level") });
    containerEl.createEl("div", { text: t("settings.stat.quality") });
    containerEl.createEl("div", { text: t("settings.stat.formatting") });
    containerEl.createEl("div", { text: t("settings.stat.ninja") });
    containerEl.createEl("div", { text: t("settings.stat.ai") });
    containerEl.createEl("div", { text: t("settings.stat.pomodoro") });
    containerEl.createEl("div", { text: t("settings.stat.streak") });
  }

  redisplayKeepingScroll(): void {
    const top = this.containerEl.scrollTop;
    this.display();
    this.containerEl.scrollTop = top;
  }
}
