import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";
import { CONTROLLED_VOCABULARY_TYPE } from "@dataspecer/controlled-vocabulary-model";

const packageIri = new URLSearchParams(window.location.search).get("package-iri")

export const isBackendConnected = !!packageIri

export async function loadVocabularies(backendUrl: string): Promise<Record<string, ControlledVocabulary>> {
  if (!packageIri) return {}
  const blobUrl = `${backendUrl}/resources/blob?iri=${encodeURIComponent(packageIri)}`
  try {
    const res = await fetch(blobUrl)
    if (!res.ok) return {}
    const data = await res.json() as { datasets?: Omit<ControlledVocabulary, "type">[] }
    const result: Record<string, ControlledVocabulary> = {}
    for (const dataset of data.datasets ?? []) {
      const vocab: ControlledVocabulary = { ...dataset, type: [CONTROLLED_VOCABULARY_TYPE] }
      result[vocab.id] = vocab
    }
    return result
  } catch {
    return {}
  }
}

export function saveVocabularies(backendUrl: string, model: Record<string, ControlledVocabulary>): void {
  if (!packageIri) return
  const blobUrl = `${backendUrl}/resources/blob?iri=${encodeURIComponent(packageIri)}`
  fetch(blobUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ datasets: Object.values(model) }),
  })
}
