import { describe, expect, test, vi } from "vitest"
import { createEuSource } from "./eu-source"

const GROUP = "http://publications.europa.eu/resource/authority/corporate-body/ESTAT"
const DATASET = "http://data.europa.eu/88u/dataset/cbf1-0"

/**
 * An endpoint that answers every query with the given rows, or fails when there are none.
 */
function endpoint(...rows: object[]) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ results: { bindings: rows } }), { status: 200 }))
}

const groupRow = {
  group: { type: "uri", value: GROUP },
  count: { type: "literal", value: "56" },
  name: { type: "literal", value: "Eurostat", "xml:lang": "en" },
  total: { type: "literal", value: "2" },
}

const candidateRow = {
  dataset: { type: "uri", value: DATASET },
  sort: { type: "literal", value: "classification of business functions" },
  title: { type: "literal", value: "Classification of Business Functions", "xml:lang": "en" },
  group: { type: "uri", value: GROUP },
  name: { type: "literal", value: "Eurostat", "xml:lang": "en" },
  total: { type: "literal", value: "56" },
}

describe("createEuSource", () => {
  test("counts the listing of groups only when the request does not bring the count", async () => {
    const counting = endpoint(groupRow)
    const page = await createEuSource({ fetch: counting }).listGroups!({ offset: 0, limit: 20 })
    expect(counting).toHaveBeenCalledTimes(2)
    expect(page.total).toBe(2)
    expect(page.items).toEqual([{ id: GROUP, count: 56, label: { en: "Eurostat" } }])

    const known = endpoint(groupRow)
    await createEuSource({ fetch: known }).listGroups!({ offset: 0, limit: 20, total: 2 })
    expect(known).toHaveBeenCalledTimes(1)
  })

  test("labels the vocabularies with the names of their groups", async () => {
    const fetchMock = endpoint({ ...groupRow, ...candidateRow })
    const page = await createEuSource({ fetch: fetchMock }).listCandidates({}, { offset: 0, limit: 20 })
    expect(page.total).toBe(56)
    expect(page.items).toEqual([
      { id: DATASET, title: { en: "Classification of Business Functions" }, groupLabel: { en: "Eurostat" } },
    ])
  })

  test("loads the groups once for all listings", async () => {
    const fetchMock = endpoint({ ...groupRow, ...candidateRow })
    const source = createEuSource({ fetch: fetchMock })
    await source.listCandidates({}, { offset: 0, limit: 20, total: 56 })
    await source.listCandidates({}, { offset: 20, limit: 20, total: 56 })
    // Two pages and one loading of the groups.
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  test("keeps the groups loaded when the listing that started loading them is cancelled", async () => {
    const fetchMock = endpoint({ ...groupRow, ...candidateRow })
    const source = createEuSource({ fetch: fetchMock })
    const cancelled = new AbortController()
    const first = source.listCandidates({}, { offset: 0, limit: 20, total: 56 }, { signal: cancelled.signal })
    cancelled.abort()
    await first.catch(() => undefined)
    const page = await source.listCandidates({}, { offset: 0, limit: 20, total: 56 })
    expect(page.items[0].groupLabel).toEqual({ en: "Eurostat" })
  })

  test("lists the vocabularies without labels when the groups cannot be loaded", async () => {
    let calls = 0
    const fetchMock = vi.fn<typeof fetch>(async () => {
      calls += 1
      // The groups are asked for after the page in the order of the requests.
      return calls === 2
        ? new Response("error", { status: 500 })
        : new Response(JSON.stringify({ results: { bindings: [candidateRow] } }), { status: 200 })
    })
    const page = await createEuSource({ fetch: fetchMock }).listCandidates({}, { offset: 0, limit: 20, total: 56 })
    expect(page.items).toHaveLength(1)
    expect(page.items[0].groupLabel).toEqual({})
  })

  test("fails the listing when the page cannot be loaded", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("error", { status: 500 }))
    await expect(createEuSource({ fetch: fetchMock }).listCandidates({}, { offset: 0, limit: 20, total: 1 })).rejects.toThrow()
  })
})
