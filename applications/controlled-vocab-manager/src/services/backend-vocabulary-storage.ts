import type { Vocabulary } from "../types/vocabulary"

const packageIri = new URLSearchParams(window.location.search).get("package-iri")

export const isBackendConnected = !!packageIri

/**
 * Transform stored dataset format to internal Vocabulary format
 */
function datasetToVocabulary(dataset: any): Vocabulary {
  return {
    id: dataset.references, // Use references as ID
    name: dataset.title,
    iri: dataset.references,
    regex: dataset.pattern,
    downloadUrl: dataset.distribution.downloadUrl,
    docsUrl: dataset.documentation,
    source: undefined, // Not stored in new format
  }
}

/**
 * Transform internal Vocabulary format to stored dataset format
 */
function vocabularyToDataset(vocabulary: Vocabulary): any {
  return {
    title: vocabulary.name,
    pattern: vocabulary.regex,
    references: vocabulary.iri,
    documentation: vocabulary.docsUrl,
    distribution: {
      downloadUrl: vocabulary.downloadUrl,
      accessUrl: vocabulary.downloadUrl, // Duplicate downloadUrl
    },
  }
}

export function loadVocabularies(backendUrl: string): Promise<Vocabulary[]> {
  if (!packageIri) return Promise.resolve([])
  const blobUrl = `${backendUrl}/resources/blob?iri=${encodeURIComponent(packageIri)}&name=controlled-vocabularies`
  return fetch(blobUrl)
    .then(res => {
      if (!res.ok) return null
      return res.json()
    })
    .then(data => {
      const datasets = data?.datasets ?? []
      return datasets.map(datasetToVocabulary)  // Transform from storage format
    })
    .catch(() => [])
}

export function saveVocabularies(backendUrl: string, vocabs: Vocabulary[]): void {
  if (!packageIri) return
  const blobUrl = `${backendUrl}/resources/blob?iri=${encodeURIComponent(packageIri)}&name=controlled-vocabularies`
  const datasets = vocabs.map(vocabularyToDataset)  // Transform to storage format
  fetch(blobUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ datasets }),
  })
}
