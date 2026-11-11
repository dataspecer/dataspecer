import { describe, expect, test, vi } from "vitest"
import { filterCandidates } from "../catalogue"
import { createEuSource } from "./eu-source"

const GROUP = "http://publications.europa.eu/resource/authority/corporate-body/ESTAT"
const DATASET = "http://data.europa.eu/88u/dataset/cbf1-0"

/**
 * One row that serves as a row of the catalogue (dataset, group, title) and as a row of
 * the names of the groups (group, name).
 */
const row = {
  dataset: { type: "uri", value: DATASET },
  group: { type: "uri", value: GROUP },
  title: { type: "literal", value: "Classification of Business Functions", "xml:lang": "en" },
  name: { type: "literal", value: "Eurostat", "xml:lang": "en" },
}

describe("createEuSource", () => {
  test("builds the catalogue from the two queries that read it, and reads it once", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ results: { bindings: [row] } }), { status: 200 }))
    const source = createEuSource({ fetch: fetchMock })

    const catalogue = await source.loadCatalogue()
    expect(catalogue.groups).toEqual([{ id: GROUP, count: 1, label: { en: "Eurostat" } }])
    expect(filterCandidates(catalogue, { query: "neexistuje" })).toEqual([])
    expect(filterCandidates(catalogue, { query: "Classification" })).toEqual([
      { id: DATASET, title: { en: "Classification of Business Functions" }, groupLabel: { en: "Eurostat" } },
    ])
    await source.loadCatalogue()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe("createEuSource readMetadata", () => {
  const FILE_TYPE = "http://publications.europa.eu/resource/authority/file-type/"
  const DATASET_TYPE = "http://publications.europa.eu/resource/authority/dataset-type/"
  const candidate = { id: DATASET, title: { en: "Classification of Business Functions" }, groupLabel: { en: "Eurostat" } }
  const OPTIONS = { language: "en" }
  const uri = (value: string) => ({ type: "uri", value })
  const bindings = [
    { identifier: { type: "literal", value: "cbf" }, type: uri(`${DATASET_TYPE}NAL`) },
    { distribution: uri("d-csv"), format: uri(`${FILE_TYPE}CSV`), accessUrl: uri("https://example.org/cbf.csv"), downloadUrl: uri("https://example.org/cbf.csv") },
    { distribution: uri("d-rdf"), format: uri(`${FILE_TYPE}RDF_XML`), accessUrl: uri("https://example.org/cbf.rdf"), downloadUrl: uri("https://example.org/cbf.rdf") },
  ]

  test("reads the metadata from the best distribution of the record", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ results: { bindings } }), { status: 200 }))
    const result = await createEuSource({ fetch: fetchMock }).readMetadata(candidate, OPTIONS)
    expect(result.metadata).toMatchObject({
      references: "http://publications.europa.eu/resource/authority/cbf",
      conformsToSkos: true,
      distribution: { accessUrl: "https://example.org/cbf.rdf", downloadUrl: "https://example.org/cbf.rdf" },
    })
  })

  test("gives the name from the listing and a warning when the record cannot be loaded", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch")
    })
    const result = await createEuSource({ fetch: fetchMock }).readMetadata(candidate, OPTIONS)
    expect(result.warnings).toEqual([{ code: "recordNotLoaded", detail: "Failed to fetch" }])
    expect(result.metadata).toEqual({
      title: { en: "Classification of Business Functions" },
      pattern: null,
      references: "",
      conformsToSkos: true,
      documentation: null,
      distribution: { downloadUrl: null, accessUrl: "" },
      iri: null,
    })
  })

  test("fails when the request is cancelled", async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      init?.signal?.throwIfAborted()
      return new Response(JSON.stringify({ results: { bindings } }), { status: 200 })
    })
    await expect(createEuSource({ fetch: fetchMock }).readMetadata(candidate, { ...OPTIONS, signal: controller.signal }))
      .rejects.toThrow()
  })
})
