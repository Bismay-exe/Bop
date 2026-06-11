export function normalizeText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .normalize('NFD') // Decompose unicode characters into base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks (accents)
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

export function tokenize(text: string | undefined | null): string[] {
  if (!text) return [];
  return normalizeText(text)
    .split(' ')
    .filter((t) => t.length > 1); // Ignore single characters for tokens
}
