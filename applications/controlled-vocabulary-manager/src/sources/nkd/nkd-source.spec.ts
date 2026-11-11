import { describe, expect, test, vi } from "vitest"
import { filterCandidates } from "../catalogue"
import { createNkdSource } from "./nkd-source"

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
