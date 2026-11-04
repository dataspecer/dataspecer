import { describe, expect, test, vi } from "vitest"
import { createNkodSource } from "./nkod-source"

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

describe("createNkodSource", () => {
  test("lists the publishers and the codelists from the two queries that read the catalogue", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ results: { bindings: [row] } }), { status: 200 }))
    const source = createNkodSource({ fetch: fetchMock })

    expect(await source.listGroups!({ offset: 0, limit: 20 })).toEqual({
      items: [{ id: PUBLISHER, count: 1, label: { cs: "Digitální a informační agentura" } }],
      total: 1,
    })
    expect((await source.listCandidates({ query: "neexistuje" }, { offset: 0, limit: 20 })).items).toEqual([])
    expect((await source.listCandidates({ query: "pohlaví" }, { offset: 0, limit: 20 })).items).toEqual([
      { id: DATASET, title: { cs: "Pohlaví" }, groupLabel: { cs: "Digitální a informační agentura" } },
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
