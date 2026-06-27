# biomeddb — Design Spec

**Date:** 2026-06-27
**Status:** Approved (design), pending implementation plan
**Author:** Belfio (with Claude)

## 1. Problem & Vision

Biomedical datasets useful for running tests, benchmarks, and ML experiments exist
in abundance but are scattered across many silos (PhysioNet, ISIC Archive, Kaggle,
NCBI GEO, OpenNeuro, Zenodo, Hugging Face, university pages). Each silo has its own
search, its own vocabulary, and no cross-silo quality signal. There is no good
discovery layer where a researcher can search by **data modality + linked
disease/outcome/marker** and get a ranked, community-curated list.

**biomeddb is the search engine + community catalog for biomedical datasets.** It is
primarily a *metadata index* that points to where data lives, and *additionally hosts*
a copy of datasets whose license explicitly permits redistribution (e.g. CC0 /
public domain). It is not a general medical-data warehouse and does not host
patient-identifiable data.

### Driving user stories

1. "I want all the ECG data related to sudden death syndrome." → User searches
   modality = ECG, concept = sudden cardiac death → ranked list → each result either
   has a **Download** button (hosted) or a **Go to source** link (linked).
2. "I want all images of moles linked to cutaneous cancer." → User searches
   modality = dermoscopy image, concept = melanoma / cutaneous carcinoma → ranked list.

## 2. Goals / Non-Goals

### Goals (MVP — "Lean discovery", scope A)
- Search by free text + structured filters (modality, disease/outcome concept,
  access type, hosted-only) returning a ranked list.
- Dataset detail pages with full metadata, source link or download, and linked concepts.
- Community contribution: authenticated users add datasets and propose dataset↔concept links.
- Community quality signal: up/down voting on **both** datasets and dataset↔concept links.
- Ontology layer so synonyms ("sudden death syndrome" / "sudden cardiac death" / "SADS")
  resolve to one concept.
- Seed content so the two driving searches return real results on first load.
- Host redistributable files where license allows; link out otherwise.

### Non-Goals (explicitly deferred to phase 2)
- Automated crawlers / continuous ingestion from many sources.
- Semantic / vector search (pgvector).
- Reputation-weighted voting.
- Wiki-style edit-merge / approval workflow.
- Public third-party API.
- Automated duplicate detection.
- Hosting patient-identifiable data or any data requiring IRB/DUA to redistribute.

## 3. Architecture

- **Frontend + backend:** Next.js (App Router, TypeScript) on Vercel. Server
  Components and Route Handlers query Postgres directly — no separate backend service.
- **Data store:** Supabase Postgres (full-text search via `tsvector`), Supabase Auth
  (email + OAuth), Supabase Storage (bucket for hosted/redistributable files).
- **Seeding:** standalone TypeScript scripts (run locally / CI) that upsert real
  entries from PhysioNet (ECG) and ISIC/HAM10000 (skin) plus a starter concept set.
- **Access control:** Postgres Row Level Security (RLS) — public read, authenticated
  write for contributions/votes, moderator role for verification.

### Component boundaries
- `search` — resolves query against concept synonyms, runs full-text + filters, ranks.
- `catalog` — dataset CRUD, detail pages, contribution form, file upload.
- `concepts` — controlled vocabulary + synonym resolution + autocomplete.
- `voting` — vote write/aggregate for datasets and dataset-concept links.
- `moderation` — status transitions (unverified → verified / flagged), edit history.
- `seed` — importers (kept isolated from app runtime).

## 4. Data Model

Postgres tables (Supabase). Types abbreviated.

### `datasets`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| title | text | required |
| description | text | |
| modality | text fk → modalities.slug | required |
| source_name | text | e.g. "PhysioNet" |
| source_url | text | canonical origin |
| host_type | enum `linked` \| `hosted` | |
| file_path | text null | Supabase Storage path when `hosted` |
| license | text | SPDX-ish string, e.g. "CC0-1.0", "ODC-By", "custom" |
| access | enum `open` \| `registration` \| `data-use-agreement` | |
| n_subjects | int null | sample size |
| format | text null | e.g. "WFDB/EDF", "JPEG", "DICOM" |
| submitted_by | uuid fk → auth.users | |
| status | enum `unverified` \| `verified` \| `flagged` | default `unverified` |
| score | int | denormalized net vote score, trigger-maintained |
| search_tsv | tsvector | generated from title+description+concept names |
| created_at / updated_at | timestamptz | |

### `concepts`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | canonical name, e.g. "Sudden cardiac death" |
| slug | text unique | |
| synonyms | text[] | e.g. {"sudden death syndrome","SADS","SCD"} |
| kind | enum `disease` \| `outcome` \| `marker` | |
| mesh_code | text null | external ontology ref |
| icd_code | text null | external ontology ref |

### `dataset_concepts` (M:N, itself votable)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| dataset_id | uuid fk | |
| concept_id | uuid fk | |
| relationship | enum `studies` \| `outcome` \| `marker` | |
| proposed_by | uuid fk → auth.users | |
| score | int | denormalized net vote score |
| unique (dataset_id, concept_id, relationship) | | |

### `modalities`
| column | type | notes |
|---|---|---|
| slug | text pk | e.g. "ecg" |
| name | text | "Electrocardiogram (ECG)" |
| category | text | "signal" / "image" / "tabular" / "genomic" |

### `votes`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk → auth.users | |
| target_type | enum `dataset` \| `dataset_concept` | |
| target_id | uuid | |
| value | smallint | +1 / -1 |
| unique (user_id, target_type, target_id) | | one vote per user per item |

### `dataset_edits` (lightweight history)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| dataset_id | uuid fk | |
| editor_id | uuid fk | |
| diff | jsonb | changed fields before/after |
| created_at | timestamptz | |

Net vote scores (`datasets.score`, `dataset_concepts.score`) are denormalized columns
maintained by a Postgres trigger on `votes` insert/update/delete, so ranking reads stay
cheap. `datasets.status` starts `unverified`; moderators flip to `verified`.

## 5. Search & Ontology

1. User submits free text + optional filters (modality, concept, access, hosted-only).
2. Backend resolves the text against `concepts.name` and `concepts.synonyms`
   (case-insensitive). Matched concept(s) expand the query.
3. Postgres full-text query over `datasets.search_tsv` plus joins on matched concepts.
4. Ranking = text relevance (`ts_rank`) blended with dataset net vote score and a
   small boost for `verified` status.
5. Results paginated; each row shows title, modality, source, linked concepts (with
   their link scores), access badge, and Download/Go-to-source action.

Synonym resolution is what makes the driving searches work regardless of phrasing.

## 6. Quality & Voting

- Up/down vote on datasets and on dataset↔concept links (two separate quality signals).
- One vote per user per target (DB unique constraint); a user may change or remove their vote.
- Net score shown as a badge and feeds ranking.
- Reputation weighting deferred (phase 2).

## 7. Contribution & Moderation

- Authenticated users add a dataset via a form: title, description, modality (select),
  source name + URL, license, access, sample size, format, and one or more concept
  links. The concept field autocompletes from `concepts`; users may propose a new
  concept (created in `unverified`-equivalent state for moderator review).
- For `hosted` datasets, an upload step is gated on an explicit license confirmation
  (must be a redistribution-permitting license).
- Submissions are **visible immediately**, tagged `unverified` — avoids the
  cold-start / moderation-bottleneck death spiral. Moderators mark `verified`; anyone
  can `flag`. Edit history retained in `dataset_edits`.

## 8. Seed Content

Importer scripts produce real entries:
- **PhysioNet ECG:** e.g. Sudden Cardiac Death Holter Database, MIT-BIH, others —
  `linked` entries with correct source URLs, licenses, modality = ecg.
- **ISIC / HAM10000 skin:** dermoscopy image sets — `linked` (and `hosted` where the
  license is CC0/redistributable), modality = dermoscopy-image.
- **Concepts:** sudden cardiac death (+ synonyms), melanoma, cutaneous carcinoma
  (+ synonyms), plus their `dataset_concepts` links.

After seeding, both driving searches return real, ranked results.

## 9. Tech Stack Summary

- Next.js (App Router) + TypeScript, deployed on Vercel.
- Supabase: Postgres + Auth + Storage, RLS for access control.
- Postgres full-text search (`tsvector` / `ts_rank`).
- Seed importers in TypeScript (Node), isolated from app runtime.

## 10. Success Criteria (MVP done when…)

1. Searching modality=ECG + "sudden death syndrome" returns the seeded sudden-cardiac-death
   datasets, correctly ranked, each with a working source link / download.
2. Searching modality=image + "moles / cutaneous cancer" returns seeded skin-lesion datasets.
3. A logged-in user can add a new dataset (linked) and it appears in search tagged `unverified`.
4. A logged-in user can up/down vote a dataset and a dataset↔concept link; scores update and affect ranking.
5. A moderator can mark a dataset `verified`; anyone can flag.
6. A redistributable file can be uploaded and downloaded for a `hosted` dataset.
7. App is deployed and reachable on Vercel with Supabase backing it.

## 11. Phase 2 (post-MVP, not now)

Automated crawlers, semantic/vector search, reputation-weighted voting, wiki-style
edit-merge, public API, automated dedup, richer multi-axis quality ratings.
