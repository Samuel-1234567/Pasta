/** Normalize nonnegative percentages onto a simplex summing ~100%. */
export function normalizeMixPct(
  conceptual: number,
  calculation: number,
  vocabulary: number,
): { conceptual: number; calculation: number; vocabulary: number; sum: number } {
  const c = Number.isFinite(conceptual) && conceptual >= 0 ? conceptual : 0
  const k = Number.isFinite(calculation) && calculation >= 0 ? calculation : 0
  const v = Number.isFinite(vocabulary) && vocabulary >= 0 ? vocabulary : 0
  const sum = c + k + v
  if (sum <= 0) {
    return { conceptual: 100, calculation: 0, vocabulary: 0, sum: 100 }
  }
  return {
    conceptual: Math.round((c / sum) * 1000) / 10,
    calculation: Math.round((k / sum) * 1000) / 10,
    vocabulary: Math.round((v / sum) * 1000) / 10,
    sum: 100,
  }
}

/** Integer counts for each category that sum to exactly `total` (respects percentages). */
export function allocateCardSlots(
  total: number,
  p: { conceptual: number; calculation: number; vocabulary: number },
): { conceptual: number; calculation: number; vocabulary: number } {
  const t = Math.max(1, Math.min(50, Math.floor(total)))
  const w = Math.max(1e-6, p.conceptual + p.calculation + p.vocabulary)
  const raw = [(t * p.conceptual) / w, (t * p.calculation) / w, (t * p.vocabulary) / w]
  const floors = raw.map((x) => Math.floor(x))
  let rem = t - floors[0] - floors[1] - floors[2]
  const frac = raw.map((x, i) => ({ i, f: x - floors[i] }))
  frac.sort((a, b) => b.f - a.f)
  for (let n = 0; n < rem; n++) {
    floors[frac[n % frac.length].i]++
  }
  return {
    conceptual: floors[0],
    calculation: floors[1],
    vocabulary: floors[2],
  }
}
