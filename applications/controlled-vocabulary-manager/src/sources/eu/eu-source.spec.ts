import { describe, expect, test, vi } from "vitest"
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
  test("lists the groups and the vocabularies from the two queries that read the catalogue", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ results: { bindings: [row] } }), { status: 200 }))
    const source = createEuSource({ fetch: fetchMock })

    expect(await source.listGroups!({ offset: 0, limit: 20 })).toEqual({
      items: [{ id: GROUP, count: 1, label: { en: "Eurostat" } }],
      total: 1,
    })
    expect((await source.listCandidates({ groupId: GROUP }, { offset: 0, limit: 20 })).items).toEqual([
      { id: DATASET, title: { en: "Classification of Business Functions" }, groupLabel: { en: "Eurostat" } },
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
