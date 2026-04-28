import type { Vocabulary } from "../types/vocabulary"

const packageIri = new URLSearchParams(window.location.search).get("package-iri")
const backendUrl = import.meta.env.VITE_BACKEND
const blobUrl = packageIri
  ? `${backendUrl}/resources/blob?iri=${encodeURIComponent(packageIri)}&name=controlled-vocabularies`
  : null

export const isBackendConnected = !!blobUrl

export function loadVocabularies(): Promise<Vocabulary[]> {
  if (!blobUrl) return Promise.resolve([])
  return fetch(blobUrl)
    .then(res => {
      if (!res.ok) return null
      return res.json()
    })
    .then(data => data?.vocabularies ?? [])
    .catch(() => [])
}

export function saveVocabularies(vocabs: Vocabulary[]): void {
  if (!blobUrl) return
  fetch(blobUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vocabularies: vocabs }),
  })
}
