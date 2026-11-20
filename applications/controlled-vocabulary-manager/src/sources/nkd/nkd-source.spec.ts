import { describe, expect, test, vi } from "vitest"
import { filterCandidates } from "../catalogue"
import { createNkdSource, NKD_SPARQL_ENDPOINT } from "./nkd-source"

const PUBLISHER = "https://rpp-opendata.egon.gov.cz/odrpp/zdroj/orgán-veřejné-moci/17651921"
const DATASET = "https://data.gov.cz/zdroj/datové-sady/17651921/b4d1"

/**
 * One row that serves as a row of the catalogue (dataset, group, title) and as a row of
 * the names of the publishers (group, name).
 */
const row = {
  dataset: { type: "uri", value: DATASET },
  group: { type: "uri", value: PUBLISHER },
  title: { type: "literal", value: "Pohlaví", "xml:lang": "cs" },
  name: { type: "literal", value: "Digitální a informační agentura", "xml:lang": "cs" },
}

describe("createNkdSource", () => {
  test("builds the catalogue from the two queries that read it, and reads it once", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ results: { bindings: [row] } }), { status: 200 }))
    const source = createNkdSource({ fetch: fetchMock })

    const catalogue = await source.loadCatalogue()
    expect(catalogue.groups).toEqual([{ id: PUBLISHER, count: 1, label: { cs: "Digitální a informační agentura" } }])
    expect(filterCandidates(catalogue, { query: "neexistuje" })).toEqual([])
    expect(filterCandidates(catalogue, { query: "pohlaví" })).toEqual([
      { id: DATASET, title: { cs: "Pohlaví" }, groupLabel: { cs: "Digitální a informační agentura" } },
    ])
    await source.loadCatalogue()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe("createNkdSource readMetadata", () => {
  const FILE_TYPE = "http://publications.europa.eu/resource/authority/file-type/"
  const SCHEME = "https://rpp-opendata.egon.gov.cz/odrpp/zdroj/číselníky/46/1900-01-01"
  const ITEMS = "https://rpp-opendata.egon.gov.cz/odrpp/zdroj/číselníky/46/položka/"
  const candidate = { id: DATASET, title: { cs: "Pohlaví" }, groupLabel: { cs: "Digitální a informační agentura" } }
  const OPTIONS = { language: "cs" }
  const uri = (value: string) => ({ type: "uri", value })
  const bindings = [
    { title: { type: "literal", value: "Pohlaví", "xml:lang": "cs" } },
    { distribution: uri("d-csv"), format: uri(`${FILE_TYPE}CSV`), accessUrl: uri("https://example.org/46.csv"), downloadUrl: uri("https://example.org/46.csv") },
    { distribution: uri("d-json"), format: uri(`${FILE_TYPE}JSON_LD`), accessUrl: uri("https://example.org/46.jsonld"), downloadUrl: uri("https://example.org/46.jsonld") },
  ]
  const codelist = {
    "@context": "https://ofn.gov.cz/číselníky/2022-02-08/kontexty/číselník.jsonld",
    iri: SCHEME,
    typ: "Číselník",
    název: { cs: "Pohlaví" },
    položky: [1, 2, 3].map((index) => ({ typ: "Položka", iri: `${ITEMS}${index}` })),
  }

  test("reads the vocabulary from the JSON-LD distribution of the record", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (url) =>
      new Response(String(url).startsWith(NKD_SPARQL_ENDPOINT) ? JSON.stringify({ results: { bindings } }) : JSON.stringify(codelist), { status: 200 }))
    const result = await createNkdSource({ fetch: fetchMock }).readMetadata(candidate, OPTIONS)
    expect(result.warnings).toEqual([])
    expect(result.metadata).toMatchObject({
      references: SCHEME,
      pattern: "^https://rpp-opendata\\.egon\\.gov\\.cz/odrpp/zdroj/číselníky/46/položka/.*$",
      distribution: { accessUrl: "https://example.org/46.jsonld", downloadUrl: "https://example.org/46.jsonld" },
    })
  })

  test("gives the name from the listing and a warning when the record cannot be loaded", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch")
    })
    const result = await createNkdSource({ fetch: fetchMock }).readMetadata(candidate, OPTIONS)
    expect(result.warnings).toEqual([{ code: "recordNotLoaded", detail: "Failed to fetch" }])
    expect(result.metadata).toMatchObject({ title: { cs: "Pohlaví" }, pattern: null, references: "", documentation: null })
  })

  test("fails when the request is cancelled", async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      init?.signal?.throwIfAborted()
      return new Response(JSON.stringify({ results: { bindings } }), { status: 200 })
    })
    await expect(createNkdSource({ fetch: fetchMock }).readMetadata(candidate, { ...OPTIONS, signal: controller.signal }))
      .rejects.toThrow()
  })
})
