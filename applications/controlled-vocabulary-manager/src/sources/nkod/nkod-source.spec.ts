import { describe, expect, test, vi } from "vitest"
import { createNkodSource } from "./nkod-source"

const PUBLISHER = "https://rpp-opendata.egon.gov.cz/odrpp/zdroj/orgán-veřejné-moci/17651921"

/**
 * An endpoint that answers every query with one row that serves both as a
 * publisher row and as a count row.
 */
function endpoint() {
  const row = {
    publisher: { type: "uri", value: PUBLISHER },
    count: { type: "literal", value: "233" },
    nameCs: { type: "literal", value: "Digitální a informační agentura", "xml:lang": "cs" },
    total: { type: "literal", value: "7" },
  }
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ results: { bindings: [row] } }), { status: 200 }))
}

describe("createNkodSource", () => {
  test("counts the listing when the request does not bring the count", async () => {
    const fetchMock = endpoint()
    const page = await createNkodSource({ fetch: fetchMock }).listGroups!({ offset: 0, limit: 20 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(page.total).toBe(7)
    expect(page.items).toEqual([{ id: PUBLISHER, count: 233, label: { cs: "Digitální a informační agentura" } }])
  })

  test("does not count the listing again when the request brings the count", async () => {
    const fetchMock = endpoint()
    const page = await createNkodSource({ fetch: fetchMock }).listGroups!({ offset: 20, limit: 20, total: 45 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(page.total).toBe(45)
  })

  test("does the same for the listing of codelists", async () => {
    const withCount = endpoint()
    await createNkodSource({ fetch: withCount }).listCandidates({ query: "pohlav" }, { offset: 0, limit: 20 })
    expect(withCount).toHaveBeenCalledTimes(2)

    const withoutCount = endpoint()
    await createNkodSource({ fetch: withoutCount }).listCandidates({}, { offset: 20, limit: 20, total: 367 })
    expect(withoutCount).toHaveBeenCalledTimes(1)
  })

  test("passes the cancellation to the endpoint", async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchMock = vi.fn<typeof fetch>((_input, init) => Promise.reject(init?.signal?.reason))
    await expect(createNkodSource({ fetch: fetchMock }).listGroups!({ offset: 0, limit: 20 }, { signal: controller.signal }))
      .rejects.toMatchObject({ kind: "aborted" })
  })
})
