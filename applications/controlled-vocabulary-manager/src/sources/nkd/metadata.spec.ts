import { describe, expect, test, vi } from "vitest"
import type { ChosenDistribution, SourceRecord } from "../sparql-source"
import { deriveMetadata } from "./metadata"

const ITEM_PREFIX = "https://rpp-opendata.egon.gov.cz/odrpp/zdroj/číselníky/46/položka/"
const SCHEME_IRI = "https://rpp-opendata.egon.gov.cz/odrpp/zdroj/číselníky/46/1900-01-01"
const FILE_URL = "https://rpp-opendata.egon.gov.cz/odrpp/datovasada/ciselnikyVdf/ciselnik_46_19000101.jsonld"

const codelist = {
  "@context": "https://ofn.gov.cz/číselníky/2022-02-08/kontexty/číselník.jsonld",
  iri: SCHEME_IRI,
  typ: "Číselník",
  název: { cs: "Pohlaví" },
  položky: Array.from({ length: 8 }, (_, index) => ({ typ: "Položka", iri: `${ITEM_PREFIX}${index + 1}` })),
}

function distribution(overrides: Partial<ChosenDistribution>): ChosenDistribution {
  return { format: "JSON-LD", accessUrl: FILE_URL, downloadUrl: FILE_URL, ...overrides }
}

function recordOf(chosen: ChosenDistribution | null): SourceRecord {
  return {
    title: { cs: "Pohlaví", en: "Sex" },
    documentationUrl: "https://example.org/docs.html",
    distribution: chosen,
  }
}

const OPTIONS = { language: "cs" }

function fetchReturning(body: string, init?: ResponseInit) {
  return vi.fn<typeof fetch>(async () => new Response(body, { status: 200, ...init }))
}

describe("deriveMetadata of an OFN JSON-LD file", () => {
  test("reads the vocabulary from the record and the file", async () => {
    const fetchMock = fetchReturning(JSON.stringify(codelist))
    const result = await deriveMetadata(recordOf(distribution({})), OPTIONS, { fetch: fetchMock })

    expect(result.warnings).toEqual([])
    expect(result.metadata).toEqual({
      title: { cs: "Pohlaví", en: "Sex" },
      pattern: "^https://rpp-opendata\\.egon\\.gov\\.cz/odrpp/zdroj/číselníky/46/položka/.*$",
      references: SCHEME_IRI,
      conformsToSkos: true,
      documentation: "https://example.org/docs.html",
      distribution: { downloadUrl: FILE_URL, accessUrl: FILE_URL },
      iri: null,
    })
    expect(fetchMock.mock.calls[0][0]).toBe(FILE_URL)
  })

  test("returns a few sample IRIs that match the pattern", async () => {
    const result = await deriveMetadata(recordOf(distribution({})), OPTIONS, { fetch: fetchReturning(JSON.stringify(codelist)) })
    expect(result.sampleIris).toEqual([1, 2, 3, 4, 5].map((index) => `${ITEM_PREFIX}${index}`))
    const regex = new RegExp(result.metadata.pattern!)
    expect(result.sampleIris.every((iri) => regex.test(iri))).toBe(true)
  })

  test("reads a file that starts with a byte order mark", async () => {
    const result = await deriveMetadata(recordOf(distribution({})), OPTIONS, { fetch: fetchReturning(`﻿${JSON.stringify(codelist)}`) })
    expect(result.metadata.references).toBe(SCHEME_IRI)
    expect(result.warnings).toEqual([])
  })

  test("warns about a file without an IRI of the vocabulary and keeps the rest", async () => {
    const withoutIris = { ...codelist, iri: undefined, položky: [{ kód: "1" }, { kód: "2" }] }
    const result = await deriveMetadata(recordOf(distribution({})), OPTIONS, { fetch: fetchReturning(JSON.stringify(withoutIris)) })
    expect(result.warnings).toEqual([{ code: "noSchemeIri" }])
    expect(result.metadata.references).toBe("")
    expect(result.metadata.pattern).toBeNull()
    expect(result.sampleIris).toEqual([])
    expect(result.metadata.distribution.accessUrl).toBe(FILE_URL)
  })

  test("reads the vocabulary but no pattern when the values have no common prefix", async () => {
    const scattered = { ...codelist, položky: [{ iri: "https://a.example.org/x" }, { iri: "https://b.example.org/y" }] }
    const result = await deriveMetadata(recordOf(distribution({})), OPTIONS, { fetch: fetchReturning(JSON.stringify(scattered)) })
    expect(result.metadata.references).toBe(SCHEME_IRI)
    expect(result.metadata.pattern).toBeNull()
    expect(result.sampleIris).toEqual([])
    expect(result.warnings).toEqual([])
  })
})

describe("deriveMetadata when the file cannot be used", () => {
  test("warns about an error status and keeps the metadata of the record", async () => {
    const fetchMock = fetchReturning("Not found", { status: 404 })
    const result = await deriveMetadata(recordOf(distribution({})), OPTIONS, { fetch: fetchMock })
    expect(result.warnings).toEqual([{ code: "fetchFailed", detail: "HTTP 404" }])
    expect(result.metadata).toMatchObject({
      title: { cs: "Pohlaví", en: "Sex" },
      references: "",
      pattern: null,
      conformsToSkos: true,
      documentation: "https://example.org/docs.html",
      distribution: { downloadUrl: FILE_URL, accessUrl: FILE_URL },
    })
  })

  test("warns when the browser blocks or loses the request", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => { throw new TypeError("Failed to fetch") })
    const result = await deriveMetadata(recordOf(distribution({})), OPTIONS, { fetch: fetchMock })
    expect(result.warnings).toEqual([{ code: "fetchFailed", detail: "Failed to fetch" }])
  })

  test("warns when the file does not arrive in time", async () => {
    const hanging = vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason))
    }))
    const result = await deriveMetadata(recordOf(distribution({})), OPTIONS, { fetch: hanging, timeoutMs: 20 })
    expect(result.warnings).toEqual([{ code: "fetchFailed", detail: "timeout" }])
  })

  test("warns about a file that is not JSON", async () => {
    const result = await deriveMetadata(recordOf(distribution({})), OPTIONS, { fetch: fetchReturning("<html>") })
    expect(result.warnings).toEqual([{ code: "notParsed" }])
  })

  test("warns about JSON that is not a codelist", async () => {
    const result = await deriveMetadata(recordOf(distribution({})), OPTIONS, { fetch: fetchReturning('{"name": "x"}') })
    expect(result.warnings).toEqual([{ code: "notParsed" }])
  })

  test("fails when the request is cancelled", async () => {
    const controller = new AbortController()
    const hanging = vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason))
    }))
    const promise = deriveMetadata(recordOf(distribution({})), { ...OPTIONS, signal: controller.signal }, { fetch: hanging })
    controller.abort()
    await expect(promise).rejects.toBeDefined()
  })
})

describe("deriveMetadata of other distributions", () => {
  test("does not load a Turtle file and warns that the IRI and pattern are not read", async () => {
    const fetchMock = fetchReturning("")
    const turtle = distribution({ format: "Turtle", accessUrl: "https://example.org/46.ttl", downloadUrl: "https://example.org/46.ttl" })
    const result = await deriveMetadata(recordOf(turtle), OPTIONS, { fetch: fetchMock })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.warnings).toEqual([{ code: "unsupportedFormat" }])
    expect(result.metadata).toMatchObject({ conformsToSkos: true, references: "", pattern: null })
  })

  test("takes a CSV file as a vocabulary that is not SKOS, referenced by its address", async () => {
    const fetchMock = fetchReturning("")
    const csv = distribution({ format: "CSV", accessUrl: "https://example.org/46.csv", downloadUrl: "https://example.org/46.csv" })
    const result = await deriveMetadata(recordOf(csv), OPTIONS, { fetch: fetchMock })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.warnings).toEqual([])
    expect(result.metadata).toMatchObject({
      conformsToSkos: false,
      references: "https://example.org/46.csv",
      distribution: { downloadUrl: "https://example.org/46.csv", accessUrl: "https://example.org/46.csv" },
    })
  })

  test("takes a SPARQL endpoint as the access URL without a download URL", async () => {
    const endpoint = distribution({ format: "SPARQL", accessUrl: "https://example.org/sparql", downloadUrl: null })
    const result = await deriveMetadata(recordOf(endpoint), OPTIONS, { fetch: fetchReturning("") })
    expect(result.warnings).toEqual([{ code: "unsupportedFormat" }])
    expect(result.metadata).toMatchObject({
      conformsToSkos: true,
      references: "",
      distribution: { downloadUrl: null, accessUrl: "https://example.org/sparql" },
    })
  })

  test("prefers the download URL to the access URL of a file", async () => {
    const file = distribution({ accessUrl: "https://example.org/page", downloadUrl: "https://example.org/46.jsonld" })
    const result = await deriveMetadata(recordOf(file), OPTIONS, { fetch: fetchReturning(JSON.stringify(codelist)) })
    expect(result.metadata.distribution).toEqual({ downloadUrl: "https://example.org/46.jsonld", accessUrl: "https://example.org/46.jsonld" })
  })
})

describe("deriveMetadata title", () => {
  const csv = distribution({ format: "CSV" })

  test("gives a title without a language the language of the interface", async () => {
    const record = { ...recordOf(csv), title: { "": "Pohlaví" } }
    expect((await deriveMetadata(record, { language: "cs" })).metadata.title).toEqual({ cs: "Pohlaví" })
  })

  test("uses only the language of the interface without its region", async () => {
    const record = { ...recordOf(csv), title: { "": "Sex" } }
    expect((await deriveMetadata(record, { language: "en-US" })).metadata.title).toEqual({ en: "Sex" })
  })

  test("keeps a title in the language of the interface over one without a language", async () => {
    const record = { ...recordOf(csv), title: { "": "Rod", cs: "Pohlaví" } }
    expect((await deriveMetadata(record, { language: "cs" })).metadata.title).toEqual({ cs: "Pohlaví" })
  })
})

describe("deriveMetadata of a record without a distribution", () => {
  test("has no addresses and says so, and loads no file", async () => {
    const fetchMock = vi.fn<typeof fetch>()
    const result = await deriveMetadata(
      { title: { cs: "Pohlaví" }, documentationUrl: "https://example.org/docs.html", distribution: null },
      OPTIONS,
      { fetch: fetchMock },
    )
    expect(result.warnings).toEqual([{ code: "noDistribution" }])
    expect(result.metadata).toMatchObject({
      title: { cs: "Pohlaví" },
      pattern: null,
      references: "",
      documentation: "https://example.org/docs.html",
      distribution: { downloadUrl: null, accessUrl: "" },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
