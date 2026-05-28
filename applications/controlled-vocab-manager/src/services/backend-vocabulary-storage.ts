import type { Vocabulary } from "../types/vocabulary"

const packageIri = new URLSearchParams(window.location.search).get("package-iri")

export const isBackendConnected = !!packageIri

export function loadVocabularies(backendUrl: string): Promise<Vocabulary[]> {
  if (!packageIri) return Promise.resolve([])
  const blobUrl = `${backendUrl}/resources/blob?iri=${encodeURIComponent(packageIri)}&name=controlled-vocabularies`
  return fetch(blobUrl)
    .then(res => {
      if (!res.ok) return null
      return res.json()
    })
    .then(data => data?.vocabularies ?? [])
    .catch(() => [])
}

export function saveVocabularies(backendUrl: string, vocabs: Vocabulary[]): void {
  if (!packageIri) return
  const blobUrl = `${backendUrl}/resources/blob?iri=${encodeURIComponent(packageIri)}&name=controlled-vocabularies`
  fetch(blobUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vocabularies: vocabs }),
  })
}
