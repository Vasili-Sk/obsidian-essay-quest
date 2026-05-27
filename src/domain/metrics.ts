export function dateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function countWords(text: string): number {
  const m = text.match(/[A-Za-z0-9']+/g);
  return m ? m.length : 0;
}

export function countParagraphs(text: string): number {
  return text
    .split(/\r?\n\s*\r?\n/g)
    .map((p) => p.trim())
    .filter(Boolean).length;
}

export function countSentences(text: string): number {
  const m = text.match(/[.!?]+/g);
  return Math.max(1, m ? m.length : 0);
}

export function qualityScore(text: string, words: number, paragraphs: number, sentences: number): number {
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

export function formattingQualityScore(text: string): number {
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

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 120) + 1);
}

export function safeNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
