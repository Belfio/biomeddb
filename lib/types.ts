export type HostType = 'linked' | 'hosted'
export type AccessLevel = 'open' | 'registration' | 'data-use-agreement'
export type DatasetStatus = 'unverified' | 'verified' | 'flagged'
export type ConceptKind = 'disease' | 'outcome' | 'marker'
export type RelationshipType = 'studies' | 'outcome' | 'marker'
export type VoteTarget = 'dataset' | 'dataset_concept'

export interface DatasetConceptLink { conceptId: string; relationship: RelationshipType }
export interface DatasetInput {
  title: string; description: string; modality: string
  sourceName: string; sourceUrl: string; hostType: HostType
  license: string; access: AccessLevel
  nSubjects?: number; format?: string
  concepts: DatasetConceptLink[]
}
