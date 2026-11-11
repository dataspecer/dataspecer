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
