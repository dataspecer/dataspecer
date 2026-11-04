import { describe, expect, test } from "vitest"
import type { SparqlRow, SparqlTerm } from "../sparql-client"
import type { SourceGroup } from "../types"
import {
  candidateCountQuery,
  candidatesQuery,
  groupsQuery,
  mapCandidateRows,
  mapGroupRows,
} from "./listing"

const ESTAT = "http://publications.europa.eu/resource/authority/corporate-body/ESTAT"
const PUBL = "http://publications.europa.eu/resource/authority/corporate-body/PUBL"
const COUNTRY = "http://data.europa.eu/88u/dataset/country"
const CURRENCY = "http://data.europa.eu/88u/dataset/currency"

function uri(value: string): SparqlTerm {
  return { type: "uri", value }
}

function literal(value: string, lang?: string): SparqlTerm {
  return lang === undefined ? { type: "literal", value } : { type: "literal", value, "xml:lang": lang }
}

function integer(value: number): SparqlTerm {
  return { type: "literal", value: String(value), datatype: "http://www.w3.org/2001/XMLSchema#integer" }
}

describe("mapGroupRows", () => {
  test("merges the rows of a group into names per language and keeps the order of the groups", () => {
    const rows: SparqlRow[] = [
      { group: uri(PUBL), count: integer(187), name: literal("Publications Office of the European Union", "en") },
      { group: uri(PUBL), count: integer(187), name: literal("Úřad pro publikace Evropské unie", "cs") },
      { group: uri(ESTAT), count: integer(56), name: literal("Eurostat", "en") },
    ]
    expect(mapGroupRows(rows)).toEqual([
      {
        id: PUBL,
        count: 187,
        label: { en: "Publications Office of the European Union", cs: "Úřad pro publikace Evropské unie" },
      },
      { id: ESTAT, count: 56, label: { en: "Eurostat" } },
    ])
  })

  test("labels a group without a name by its IRI", () => {
    expect(mapGroupRows([{ group: uri(ESTAT), count: integer(3) }])).toEqual([
      { id: ESTAT, count: 3, label: { "": ESTAT } },
    ])
  })

  test("skips a row without a group", () => {
    expect(mapGroupRows([{ count: integer(3) }])).toEqual([])
  })
})

describe("mapCandidateRows", () => {
  test("merges the rows of a vocabulary, which come one per title", () => {
    const rows: SparqlRow[] = [
      { dataset: uri(COUNTRY), sort: literal("countries"), title: literal("Countries", "en"), group: uri(PUBL) },
      { dataset: uri(COUNTRY), sort: literal("countries"), title: literal("Země", "cs"), group: uri(PUBL) },
    ]
    expect(mapCandidateRows(rows)).toEqual([
      { id: COUNTRY, title: { en: "Countries", cs: "Země" }, groupLabel: {} },
    ])
  })

  test("labels a vocabulary with the label of its group from the given groups", () => {
    const rows: SparqlRow[] = [
      { dataset: uri(COUNTRY), sort: literal("countries"), title: literal("Countries", "en"), group: uri(PUBL) },
    ]
    const groups: SourceGroup[] = [
      { id: ESTAT, count: 56, label: { en: "Eurostat" } },
      { id: PUBL, count: 187, label: { en: "Publications Office", cs: "Úřad pro publikace" } },
    ]
    expect(mapCandidateRows(rows, groups)[0].groupLabel).toEqual({ en: "Publications Office", cs: "Úřad pro publikace" })
  })

  test("puts the vocabularies in the order of the sort key, whatever the order of the rows", () => {
    const rows: SparqlRow[] = [
      { dataset: uri(COUNTRY), sort: literal("countries"), title: literal("Countries", "en") },
      { dataset: uri(CURRENCY), sort: literal("currencies"), title: literal("Currencies", "en") },
      { dataset: uri(COUNTRY), sort: literal("countries"), title: literal("Země", "cs") },
    ]
    expect(mapCandidateRows(rows).map((candidate) => candidate.id)).toEqual([COUNTRY, CURRENCY])
    expect(mapCandidateRows([...rows].reverse()).map((candidate) => candidate.id)).toEqual([COUNTRY, CURRENCY])
  })

  test("orders vocabularies with the same sort key by their IRI", () => {
    const rows: SparqlRow[] = [
      { dataset: uri(CURRENCY), sort: literal("same"), title: literal("B", "en") },
      { dataset: uri(COUNTRY), sort: literal("same"), title: literal("A", "en") },
    ]
    expect(mapCandidateRows(rows).map((candidate) => candidate.id)).toEqual([COUNTRY, CURRENCY])
  })

  test("titles a vocabulary without a title by its IRI and leaves its group label empty", () => {
    const rows: SparqlRow[] = [{ dataset: uri(COUNTRY), sort: literal("~countries") }]
    expect(mapCandidateRows(rows)).toEqual([{ id: COUNTRY, title: { "": COUNTRY }, groupLabel: {} }])
  })
})

describe("query builders", () => {
  test("reject a page that is not a non-negative integer", () => {
    expect(() => groupsQuery(-1, 0)).toThrow()
    expect(() => groupsQuery(20, 1.5)).toThrow()
    expect(() => candidatesQuery({}, 20, -20)).toThrow()
  })

  test("reject a group that is not usable as an IRI", () => {
    expect(() => candidatesQuery({ groupId: "http://x> } DROP" }, 20, 0)).toThrow()
    expect(() => candidateCountQuery({ groupId: "" })).toThrow()
  })

  test("accept a search text with quotes and backslashes", () => {
    expect(() => candidatesQuery({ query: 'a"b\\c' }, 20, 0)).not.toThrow()
    expect(() => candidateCountQuery({ query: 'a"b\\c' })).not.toThrow()
  })
})
