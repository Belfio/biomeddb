import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

async function main() {
  await db.from('modalities').upsert([
    { slug: 'ecg', name: 'Electrocardiogram (ECG)', category: 'signal' },
    { slug: 'dermoscopy-image', name: 'Dermoscopy image', category: 'image' },
  ])

  const concepts = [
    { name: 'Sudden cardiac death', slug: 'sudden-cardiac-death', kind: 'disease',
      synonyms: ['sudden death syndrome', 'SADS', 'SCD', 'sudden arrhythmic death'] },
    { name: 'Melanoma', slug: 'melanoma', kind: 'disease',
      synonyms: ['cutaneous melanoma', 'malignant melanoma', 'skin cancer'] },
    { name: 'Cutaneous carcinoma', slug: 'cutaneous-carcinoma', kind: 'disease',
      synonyms: ['basal cell carcinoma', 'squamous cell carcinoma', 'non-melanoma skin cancer'] },
  ]
  await db.from('concepts').upsert(concepts, { onConflict: 'slug' })
  const { data: conceptRows } = await db.from('concepts').select('id, slug')
  const cid = (slug: string) => conceptRows!.find((c) => c.slug === slug)!.id

  const datasets = [
    { title: 'Sudden Cardiac Death Holter Database', description: 'Long-term ECG (Holter) recordings from patients who experienced sudden cardiac death.',
      modality: 'ecg', source_name: 'PhysioNet', source_url: 'https://physionet.org/content/sddb/',
      host_type: 'linked', license: 'ODC-By-1.0', access: 'open', format: 'WFDB', status: 'verified', links: ['sudden-cardiac-death'] },
    { title: 'MIT-BIH Arrhythmia Database', description: 'Annotated ambulatory ECG recordings widely used for arrhythmia research.',
      modality: 'ecg', source_name: 'PhysioNet', source_url: 'https://physionet.org/content/mitdb/',
      host_type: 'linked', license: 'ODC-By-1.0', access: 'open', format: 'WFDB', status: 'verified', links: ['sudden-cardiac-death'] },
    { title: 'HAM10000', description: '10,015 dermatoscopic images of pigmented skin lesions across diagnostic categories.',
      modality: 'dermoscopy-image', source_name: 'Harvard Dataverse / ISIC', source_url: 'https://doi.org/10.7910/DVN/DBW86T',
      host_type: 'linked', license: 'CC-BY-NC-4.0', access: 'open', format: 'JPEG', status: 'verified', links: ['melanoma', 'cutaneous-carcinoma'] },
    { title: 'ISIC Archive (Skin Lesion Images)', description: 'Largest public archive of dermoscopic images for skin cancer (melanoma) detection.',
      modality: 'dermoscopy-image', source_name: 'ISIC', source_url: 'https://www.isic-archive.com/',
      host_type: 'linked', license: 'CC-0 / CC-BY (varies)', access: 'open', format: 'JPEG', status: 'verified', links: ['melanoma'] },
  ]

  for (const d of datasets) {
    const { links, ...row } = d
    const { data: existing } = await db.from('datasets').select('id').eq('source_url', row.source_url).maybeSingle()
    let id = existing?.id
    if (!id) {
      const { data, error } = await db.from('datasets').insert(row).select('id').single()
      if (error) throw error
      id = data!.id
    }
    for (const slug of links) {
      await db.from('dataset_concepts')
        .upsert({ dataset_id: id, concept_id: cid(slug), relationship: 'studies' }, { onConflict: 'dataset_id,concept_id,relationship' })
    }
  }

  // Create private storage bucket for hosted datasets (idempotent)
  const { error: bucketError } = await db.storage.createBucket('datasets', { public: false })
  if (bucketError && !bucketError.message.includes('already exists') && !bucketError.message.includes('Duplicate')) {
    console.warn('Bucket creation warning:', bucketError.message)
  }

  console.log('seed complete')
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
