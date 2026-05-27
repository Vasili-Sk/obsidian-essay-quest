import commonEn from "../../locales/en/common.json";
import dashboardEn from "../../locales/en/dashboard.json";
import settingsEn from "../../locales/en/settings.json";
import achievementsEn from "../../locales/en/achievements.json";

import commonRu from "../../locales/ru/common.json";
import dashboardRu from "../../locales/ru/dashboard.json";
import settingsRu from "../../locales/ru/settings.json";
import achievementsRu from "../../locales/ru/achievements.json";

import commonEs from "../../locales/es/common.json";
import dashboardEs from "../../locales/es/dashboard.json";
import settingsEs from "../../locales/es/settings.json";
import achievementsEs from "../../locales/es/achievements.json";

import commonDe from "../../locales/de/common.json";
import dashboardDe from "../../locales/de/dashboard.json";
import settingsDe from "../../locales/de/settings.json";
import achievementsDe from "../../locales/de/achievements.json";

export type SupportedLocale = "en" | "ru" | "es" | "de";
export type LocaleMode = "auto" | SupportedLocale;

type Dict = Record<string, string>;

const resources: Record<SupportedLocale, Dict> = {
  en: { ...commonEn, ...dashboardEn, ...settingsEn, ...achievementsEn },
  ru: { ...commonRu, ...dashboardRu, ...settingsRu, ...achievementsRu },
  es: { ...commonEs, ...dashboardEs, ...settingsEs, ...achievementsEs },
  de: { ...commonDe, ...dashboardDe, ...settingsDe, ...achievementsDe }
};

let activeLocale: SupportedLocale = "en";

export function resolveLocale(appLocale: string, localeMode: LocaleMode): SupportedLocale {
  if (localeMode === "en" || localeMode === "ru" || localeMode === "es" || localeMode === "de") return localeMode;
  const n = (appLocale || "").toLowerCase();
  if (n.startsWith("ru")) return "ru";
  if (n.startsWith("es")) return "es";
  if (n.startsWith("de")) return "de";
  return "en";
}

export function initI18n(appLocale: string, localeMode: LocaleMode): SupportedLocale {
  activeLocale = resolveLocale(appLocale, localeMode);
  return activeLocale;
}

export function getActiveLocale(): SupportedLocale {
  return activeLocale;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const source = resources[activeLocale][key] ?? resources.en[key] ?? key;
  if (!vars) return source;
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, token: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, token)) {
      return String(vars[token]);
    }
    return m;
  });
}

export function getLocaleResources(): Record<SupportedLocale, Dict> {
  return resources;
}
