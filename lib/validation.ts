import { z } from 'zod'

export const relationshipEnum = z.enum(['studies', 'outcome', 'marker'])

export const datasetInputSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).default(''),
  modality: z.string().min(1),
  sourceName: z.string().min(1),
  sourceUrl: z.string().url(),
  hostType: z.enum(['linked', 'hosted']),
  license: z.string().default(''),
  access: z.enum(['open', 'registration', 'data-use-agreement']),
  nSubjects: z.number().int().positive().optional(),
  format: z.string().optional(),
  concepts: z.array(z.object({ conceptId: z.string().uuid(), relationship: relationshipEnum })).min(1),
}).refine((d) => d.hostType !== 'hosted' || d.license.trim().length > 0, {
  message: 'Hosted datasets require a redistribution-permitting license', path: ['license'],
})

export const voteSchema = z.object({
  targetType: z.enum(['dataset', 'dataset_concept']),
  targetId: z.string().uuid(),
  value: z.union([z.literal(1), z.literal(-1)]),
})

export const conceptProposalSchema = z.object({
  name: z.string().min(2).max(200),
  kind: z.enum(['disease', 'outcome', 'marker']),
  synonyms: z.array(z.string()).default([]),
})
