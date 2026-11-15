export function rankScore(tsRank: number, voteScore: number, verified: boolean): number {
  return tsRank * 10 + voteScore + (verified ? 2 : 0)
}
