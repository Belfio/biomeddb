'use client'
import { useState, useTransition } from 'react'
import { createDatasetAction } from '@/app/actions/datasets'
import {
  ConceptAutocomplete,
  type SelectedConcept,
} from '@/components/ConceptAutocomplete'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'

const fieldClass =
  'w-full rounded-xl border border-hairline bg-surface px-4 py-2.5 text-base text-text placeholder:text-secondary transition-colors focus:border-accent'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-secondary'

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-secondary">{hint}</p>}
    </div>
  )
}

export default function Contribute() {
  const [concepts, setConcepts] = useState<SelectedConcept[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)

    if (concepts.length === 0) {
      setError(
        'Link at least one concept so people can find this dataset by what it studies.',
      )
      return
    }

    const input = {
      title: String(fd.get('title') ?? ''),
      description: String(fd.get('description') ?? ''),
      modality: String(fd.get('modality') ?? ''),
      sourceName: String(fd.get('sourceName') ?? ''),
      sourceUrl: String(fd.get('sourceUrl') ?? ''),
      hostType: 'linked' as const,
      license: String(fd.get('license') ?? ''),
      access: String(fd.get('access') ?? ''),
      concepts: concepts.map((c) => ({
        conceptId: c.conceptId,
        relationship: c.relationship,
      })),
    }

    startTransition(async () => {
      // On success the action redirects, so control never returns here.
      const res = await createDatasetAction(input)
      if (res && 'error' in res) setError(res.error)
    })
  }

  return (
    <main className="flex flex-1 flex-col">
      <Container className="py-12 sm:py-16">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-text">
              Add a dataset
            </h1>
            <p className="text-base leading-relaxed text-secondary">
              Link to an existing biomedical dataset. New entries start as{' '}
              <span className="font-mono text-text">unverified</span> until the
              community reviews them.
            </p>
          </div>

          <Card className="p-6 sm:p-8">
            <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
              <Field label="Title" htmlFor="title">
                <input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. PTB-XL 12-lead ECG database"
                  className={fieldClass}
                />
              </Field>

              <Field label="Description" htmlFor="description">
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="What the dataset contains and how it was collected."
                  className={`${fieldClass} resize-y`}
                />
              </Field>

              <Field label="Modality" htmlFor="modality">
                <select id="modality" name="modality" className={fieldClass}>
                  <option value="ecg">ECG</option>
                  <option value="dermoscopy-image">Dermoscopy image</option>
                </select>
              </Field>

              <Field
                label="Source name"
                htmlFor="sourceName"
                hint="The host or publisher."
              >
                <input
                  id="sourceName"
                  name="sourceName"
                  required
                  placeholder="e.g. PhysioNet"
                  className={fieldClass}
                />
              </Field>

              <Field label="Source URL" htmlFor="sourceUrl">
                <input
                  id="sourceUrl"
                  name="sourceUrl"
                  type="url"
                  required
                  placeholder="https://physionet.org/content/…"
                  className={fieldClass}
                />
              </Field>

              <Field
                label="License"
                htmlFor="license"
                hint="Use an SPDX identifier where possible."
              >
                <input
                  id="license"
                  name="license"
                  placeholder="e.g. CC0-1.0"
                  className={fieldClass}
                />
              </Field>

              <Field label="Access" htmlFor="access">
                <select id="access" name="access" className={fieldClass}>
                  <option value="open">Open</option>
                  <option value="registration">Registration</option>
                  <option value="data-use-agreement">
                    Data use agreement
                  </option>
                </select>
              </Field>

              <Field label="Linked concepts">
                <ConceptAutocomplete onChange={setConcepts} />
              </Field>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-warning/20 bg-warning-bg px-4 py-3 text-sm text-warning"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-1 w-full rounded-xl bg-accent px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit sm:self-end sm:px-8"
              >
                {pending ? 'Submitting…' : 'Submit dataset'}
              </button>
            </form>
          </Card>
        </div>
      </Container>
    </main>
  )
}
