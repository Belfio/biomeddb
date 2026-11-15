export interface ConceptLike { id: string; name: string; synonyms: string[] }

export function normalizeTerm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function matchConcepts(term: string, concepts: ConceptLike[]): ConceptLike[] {
  const t = normalizeTerm(term)
  if (!t) return []
  return concepts.filter((c) => {
    const hay = [c.name, ...c.synonyms].map(normalizeTerm)
    return hay.some((h) => h === t || h.includes(t) || t.includes(h))
  })
}
