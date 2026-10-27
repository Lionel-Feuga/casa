// Normalisation des noms (section 3.3) : sans accents, sans majuscules, espaces réduits, œ → oe, æ → ae.
export function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
