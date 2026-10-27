import { useState, useEffect, useCallback } from "react";
import { en, TranslationKey } from "./en";
import { hi } from "./hi";
import { pa } from "./pa";

export type Language = "en" | "hi" | "pa";

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  pa: "ਪੰਜਾਬੀ"
};

const dictionaries: Record<Language, Partial<Record<TranslationKey, string>>> = {
  en,
  hi,
  pa
};

function loadFontForLanguage(lang: Language) {
  if (typeof document === "undefined") return;

  if (lang === "hi") {
    const existing = document.getElementById("font-noto-devanagari");
    if (!existing) {
      const link = document.createElement("link");
      link.id = "font-noto-devanagari";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  } else if (lang === "pa") {
    const existing = document.getElementById("font-noto-gurmukhi");
    if (!existing) {
      const link = document.createElement("link");
      link.id = "font-noto-gurmukhi";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Gurmukhi:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }
}

export function detectInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem("mintshelf_lang");
    if (stored === "en" || stored === "hi" || stored === "pa") {
      return stored;
    }
  } catch {}

  if (typeof navigator !== "undefined" && navigator.language) {
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith("hi")) return "hi";
    if (nav.startsWith("pa")) return "pa";
  }

  return "en";
}

export function useT() {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage);

  useEffect(() => {
    loadFontForLanguage(language);
  }, [language]);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem("mintshelf_lang", newLang);
    } catch {}
    loadFontForLanguage(newLang);
  }, []);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = dictionaries[language];
    let template = (dict && dict[key]) || en[key] || String(key);

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return template;
  }, [language]);

  return {
    t,
    language,
    setLanguage,
    fontFamily:
      language === "hi"
        ? "'Noto Sans Devanagari', var(--font-ui), sans-serif"
        : language === "pa"
        ? "'Noto Sans Gurmukhi', var(--font-ui), sans-serif"
        : undefined
  };
}
