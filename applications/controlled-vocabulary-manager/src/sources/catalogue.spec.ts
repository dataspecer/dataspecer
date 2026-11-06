import { describe, expect, test, vi } from "vitest"
import { buildCatalogue, createCatalogueListing, listCandidates, listGroups, type CatalogueRows } from "./catalogue"
import { SparqlError, type SparqlRow, type SparqlTerm } from "./sparql-client"

const ESTAT = "http://example.org/body/ESTAT"
const PUBL = "http://example.org/body/PUBL"
const COM = "http://example.org/body/COM"
const COUNTRY = "http://example.org/dataset/country"
const CURRENCY = "http://example.org/dataset/currency"
const CBF = "http://example.org/dataset/cbf"

function uri(value: string): SparqlTerm {
  return { type: "uri", value }
}

function literal(value: string, lang?: string): SparqlTerm {
  return lang === undefined ? { type: "literal", value } : { type: "literal", value, "xml:lang": lang }
}

function row(dataset: string, group: string, title?: SparqlTerm): SparqlRow {
  return title === undefined
    ? { dataset: uri(dataset), group: uri(group) }
    : { dataset: uri(dataset), group: uri(group), title }
}

const groupNames: SparqlRow[] = [
  { group: uri(PUBL), name: literal("Publications Office", "en") },
  { group: uri(PUBL), name: literal("Úřad pro publikace", "cs") },
  { group: uri(ESTAT), name: literal("Eurostat", "en") },
]

const rows: SparqlRow[] = [
  row(CURRENCY, PUBL, literal("Currency Named Authority List", "en")),
  row(COUNTRY, PUBL, literal("Countries and territories", "en")),
  row(COUNTRY, PUBL, literal("Země a území", "cs")),
  row(CBF, ESTAT, literal("Classification of Business Functions", "en")),
]

const EN = { sortLanguage: "en" }

function catalogueOf(catalogue: SparqlRow[], names: SparqlRow[] = groupNames, options = EN) {
  return buildCatalogue({ catalogue, groupNames: names }, options)
}

describe("buildCatalogue", () => {
  test("merges the rows of a vocabulary into titles per language", () => {
    const { entries } = catalogueOf(rows)
    expect(entries.find((entry) => entry.id === COUNTRY)?.title).toEqual({ en: "Countries and territories", cs: "Země a území" })
  })

  test("orders the vocabularies by their title in the sort language, ignoring case, whatever the order of the rows", () => {
    expect(catalogueOf(rows).entries.map((entry) => entry.id)).toEqual([CBF, COUNTRY, CURRENCY])
    expect(catalogueOf([...rows].reverse()).entries.map((entry) => entry.id)).toEqual([CBF, COUNTRY, CURRENCY])
  })

  test("sorts by the title in the language of the source", () => {
    const czech = [
      row("urn:a", PUBL, literal("Zebra", "en")),
      row("urn:a", PUBL, literal("Anděl", "cs")),
      row("urn:b", PUBL, literal("Auto", "en")),
      row("urn:b", PUBL, literal("Žába", "cs")),
    ]
    expect(catalogueOf(czech, groupNames, { sortLanguage: "cs" }).entries.map((entry) => entry.id)).toEqual(["urn:a", "urn:b"])
    expect(catalogueOf(czech, groupNames, { sortLanguage: "en" }).entries.map((entry) => entry.id)).toEqual(["urn:b", "urn:a"])
  })

  test("puts a vocabulary without a title in the sort language after those with one, by its other title", () => {
    const { entries } = catalogueOf([
      row("urn:b", PUBL, literal("Zebra", "cs")),
      row("urn:a", PUBL, literal("Aardvark", "cs")),
      row("urn:u", PUBL, literal("Untagged")),
      row(COUNTRY, PUBL, literal("Countries", "en")),
    ])
    expect(entries.map((entry) => entry.id)).toEqual([COUNTRY, "urn:a", "urn:u", "urn:b"])
  })

  test("orders vocabularies with the same title by their IRI", () => {
    const { entries } = catalogueOf([row("urn:b", PUBL, literal("Same", "en")), row("urn:a", PUBL, literal("Same", "en"))])
    expect(entries.map((entry) => entry.id)).toEqual(["urn:a", "urn:b"])
  })

  test("titles a vocabulary without a title by its IRI and puts it last", () => {
    const { entries } = catalogueOf([row("urn:untitled", PUBL), row(COUNTRY, PUBL, literal("Countries", "en"))])
    expect(entries.map((entry) => entry.id)).toEqual([COUNTRY, "urn:untitled"])
    expect(entries[1].title).toEqual({ "": "urn:untitled" })
  })

  test("counts the vocabularies of the groups, the biggest group first, and names them in all languages", () => {
    expect(catalogueOf(rows).groups).toEqual([
      { id: PUBL, count: 2, label: { en: "Publications Office", cs: "Úřad pro publikace" } },
      { id: ESTAT, count: 1, label: { en: "Eurostat" } },
    ])
  })

  test("orders groups of the same size by IRI and labels a group without a name by its IRI", () => {
    const { groups } = catalogueOf([row(COUNTRY, PUBL, literal("A", "en")), row(CBF, COM, literal("B", "en"))], [])
    expect(groups).toEqual([
      { id: COM, count: 1, label: { "": COM } },
      { id: PUBL, count: 1, label: { "": PUBL } },
    ])
  })

  test("has no group without a vocabulary", () => {
    expect(catalogueOf([row(CBF, ESTAT, literal("B", "en"))]).groups.map((group) => group.id)).toEqual([ESTAT])
  })

  test("skips a row without a vocabulary or a group", () => {
    expect(catalogueOf([{ title: literal("x", "en") }, { dataset: uri(COUNTRY) }]).entries).toEqual([])
  })
})

describe("listGroups", () => {
  const catalogue = catalogueOf(rows)

  test("cuts a page and tells the number of all the groups", () => {
    expect(listGroups(catalogue, { offset: 0, limit: 1 })).toEqual({ items: [catalogue.groups[0]], total: 2 })
    expect(listGroups(catalogue, { offset: 1, limit: 1 })).toEqual({ items: [catalogue.groups[1]], total: 2 })
  })

  test("gives no items past the end", () => {
    expect(listGroups(catalogue, { offset: 20, limit: 20 })).toEqual({ items: [], total: 2 })
  })

  test("rejects a page that is not a non-negative integer", () => {
    expect(() => listGroups(catalogue, { offset: 0, limit: 1.5 })).toThrow()
    expect(() => listGroups(catalogue, { offset: -1, limit: 20 })).toThrow()
  })
})

describe("listCandidates", () => {
  const catalogue = catalogueOf(rows)

  test("lists the vocabularies in order, labeled with their groups", () => {
    const page = listCandidates(catalogue, {}, { offset: 0, limit: 20 })
    expect(page.total).toBe(3)
    expect(page.items.map((candidate) => candidate.id)).toEqual([CBF, COUNTRY, CURRENCY])
    expect(page.items[0]).toEqual({ id: CBF, title: { en: "Classification of Business Functions" }, groupLabel: { en: "Eurostat" } })
    expect(page.items[1].groupLabel).toEqual({ en: "Publications Office", cs: "Úřad pro publikace" })
  })

  test("cuts pages and counts the whole listing", () => {
    expect(listCandidates(catalogue, {}, { offset: 1, limit: 1 })).toMatchObject({ total: 3, items: [{ id: COUNTRY }] })
    expect(listCandidates(catalogue, {}, { offset: 2, limit: 5 }).items.map((candidate) => candidate.id)).toEqual([CURRENCY])
  })

  test("keeps only the vocabularies of the group", () => {
    const page = listCandidates(catalogue, { groupId: PUBL }, { offset: 0, limit: 20 })
    expect(page.total).toBe(2)
    expect(page.items.map((candidate) => candidate.id)).toEqual([COUNTRY, CURRENCY])
  })

  test("searches the titles in any language ignoring case", () => {
    expect(listCandidates(catalogue, { query: "COUNTR" }, { offset: 0, limit: 20 }).items.map((candidate) => candidate.id)).toEqual([COUNTRY])
    expect(listCandidates(catalogue, { query: "země" }, { offset: 0, limit: 20 }).items.map((candidate) => candidate.id)).toEqual([COUNTRY])
  })

  test("trims the search text and treats a blank one as no search", () => {
    expect(listCandidates(catalogue, { query: "  currency " }, { offset: 0, limit: 20 }).total).toBe(1)
    expect(listCandidates(catalogue, { query: "   " }, { offset: 0, limit: 20 }).total).toBe(3)
  })

  test("combines the group and the search", () => {
    expect(listCandidates(catalogue, { groupId: ESTAT, query: "countr" }, { offset: 0, limit: 20 }).total).toBe(0)
    expect(listCandidates(catalogue, { groupId: PUBL, query: "countr" }, { offset: 0, limit: 20 }).total).toBe(1)
  })

  test("takes the search text literally", () => {
    expect(listCandidates(catalogue, { query: '.*"\\' }, { offset: 0, limit: 20 }).total).toBe(0)
  })

  test("rejects a page that is not a non-negative integer", () => {
    expect(() => listCandidates(catalogue, {}, { offset: -1, limit: 20 })).toThrow()
  })
})

describe("createCatalogueListing", () => {
  const data: CatalogueRows = { catalogue: rows, groupNames }

  test("reads the catalogue once for all the listings, also those that start at the same time", async () => {
    const read = vi.fn(async () => data)
    const listing = createCatalogueListing(read, EN)
    await Promise.all([listing.listGroups({ offset: 0, limit: 20 }), listing.listCandidates({}, { offset: 0, limit: 20 })])
    await listing.listCandidates({ query: "country" }, { offset: 0, limit: 20 })
    await listing.listGroups({ offset: 0, limit: 20 })
    expect(read).toHaveBeenCalledTimes(1)
  })

  test("lists what was read, in the order of the sort language", async () => {
    const listing = createCatalogueListing(async () => data, EN)
    expect((await listing.listGroups({ offset: 0, limit: 20 })).total).toBe(2)
    expect((await listing.listCandidates({}, { offset: 0, limit: 20 })).items[0].id).toBe(CBF)
  })

  test("keeps the catalogue when the listing that started reading it is cancelled", async () => {
    const read = vi.fn(async () => data)
    const listing = createCatalogueListing(read, EN)
    const cancelled = new AbortController()
    const first = listing.listCandidates({}, { offset: 0, limit: 20 }, { signal: cancelled.signal })
    cancelled.abort()
    await first
    expect((await listing.listCandidates({}, { offset: 0, limit: 20 })).items).toHaveLength(3)
    expect(read).toHaveBeenCalledTimes(1)
  })

  test("fails the listing when the catalogue cannot be read and reads it again next time", async () => {
    let failing = true
    const read = vi.fn(async () => {
      if (failing) {
        throw new SparqlError("network", "Failed to fetch")
      }
      return data
    })
    const listing = createCatalogueListing(read, EN)
    await expect(listing.listCandidates({}, { offset: 0, limit: 20 })).rejects.toThrow("Failed to fetch")
    failing = false
    expect((await listing.listCandidates({}, { offset: 0, limit: 20 })).items).toHaveLength(3)
    expect(read).toHaveBeenCalledTimes(2)
  })
})
