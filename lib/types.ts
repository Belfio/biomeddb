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

export interface DatasetRow {
  id: string; title: string; description: string; modality: string
  source_name: string; source_url: string; host_type: HostType
  file_path: string | null; license: string; access: AccessLevel
  n_subjects: number | null; format: string | null
  status: DatasetStatus; score: number; created_at: string
}
export interface LinkedConcept { id: string; conceptId: string; name: string; relationship: RelationshipType; score: number }
export interface DatasetDetail extends DatasetRow { concepts: LinkedConcept[] }
