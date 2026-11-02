import { describe, expect, test } from "vitest"
import type { SparqlRow, SparqlTerm } from "../sparql-client"
import {
  candidateCountQuery,
  candidatesQuery,
  escapeSparqlString,
  mapCandidateRows,
  mapPublisherRows,
} from "./listing"

const DIA = "https://rpp-opendata.egon.gov.cz/odrpp/zdroj/orgán-veřejné-moci/17651921"
const MSMT = "https://rpp-opendata.egon.gov.cz/odrpp/zdroj/orgán-veřejné-moci/00022985"

function uri(value: string): SparqlTerm {
  return { type: "uri", value }
}

function literal(value: string, lang?: string): SparqlTerm {
  return lang === undefined ? { type: "literal", value } : { type: "literal", value, "xml:lang": lang }
}

function integer(value: number): SparqlTerm {
  return { type: "literal", value: String(value), datatype: "http://www.w3.org/2001/XMLSchema#integer" }
}

describe("mapPublisherRows", () => {
  test("maps a row to a group with names per language", () => {
    const rows: SparqlRow[] = [
      { publisher: uri(DIA), count: integer(421), nameCs: literal("Digitální a informační agentura", "cs"), nameEn: literal("Digital and Information agency", "en") },
    ]
    expect(mapPublisherRows(rows)).toEqual([
      { id: DIA, count: 421, label: { cs: "Digitální a informační agentura", en: "Digital and Information agency" } },
    ])
  })

  test("keeps the order of the rows", () => {
    const rows: SparqlRow[] = [
      { publisher: uri(DIA), count: integer(421), nameCs: literal("DIA", "cs") },
      { publisher: uri(MSMT), count: integer(71), nameCs: literal("MŠMT", "cs") },
    ]
    expect(mapPublisherRows(rows).map((group) => group.id)).toEqual([DIA, MSMT])
  })

  test("merges rows of one publisher with different names", () => {
    const rows: SparqlRow[] = [
      { publisher: uri(MSMT), count: integer(71), nameCs: literal("Ministerstvo školství", "cs") },
      { publisher: uri(MSMT), count: integer(71), nameCs: literal("MŠMT", "cs"), nameEn: literal("Ministry of Education", "en") },
    ]
    expect(mapPublisherRows(rows)).toEqual([
      { id: MSMT, count: 71, label: { cs: "Ministerstvo školství", en: "Ministry of Education" } },
    ])
  })

  test("stores a name without a language under the empty key", () => {
    const rows: SparqlRow[] = [{ publisher: uri(DIA), count: integer(1), namePlain: literal("DIA") }]
    expect(mapPublisherRows(rows)[0].label).toEqual({ "": "DIA" })
  })

  test("labels a publisher without names by its IRI", () => {
    const rows: SparqlRow[] = [{ publisher: uri(DIA), count: integer(3) }]
    expect(mapPublisherRows(rows)).toEqual([{ id: DIA, count: 3, label: { "": DIA } }])
  })

  test("skips rows without a publisher", () => {
    expect(mapPublisherRows([{ count: integer(3) }])).toEqual([])
  })
})

describe("escapeSparqlString", () => {
  test("escapes quotes, backslashes and line breaks", () => {
    expect(escapeSparqlString('a"b\\c\nd\re\tf')).toBe('a\\"b\\\\c\\nd\\re\\tf')
  })

  test("leaves other text, including Czech letters, as it is", () => {
    expect(escapeSparqlString("Číselník ČSÚ (kód 5103)")).toBe("Číselník ČSÚ (kód 5103)")
  })
})

describe("candidate filter", () => {
  test("rejects a group id that is not a safe IRI", () => {
    for (const groupId of ["", "a b", "x> } # <y", 'x"y', "x\ny"]) {
      expect(() => candidatesQuery({ groupId }, 20, 0)).toThrow()
      expect(() => candidateCountQuery({ groupId })).toThrow()
    }
  })

  test("accepts the IRI of a publisher", () => {
    expect(() => candidatesQuery({ groupId: DIA }, 20, 0)).not.toThrow()
  })
})

describe("mapCandidateRows", () => {
  const DATASET_A = "https://data.gov.cz/zdroj/datové-sady/17651921/aaa"
  const DATASET_B = "https://data.gov.cz/zdroj/datové-sady/17651921/bbb"
  const DATASET_C = "https://data.gov.cz/zdroj/datové-sady/00022985/ccc"

  test("maps a row to a candidate with titles and the publisher name", () => {
    const rows: SparqlRow[] = [{
      dataset: uri(DATASET_A),
      sort: literal("pohlaví"),
      titleCs: literal("Pohlaví", "cs"),
      titleEn: literal("Sex", "en"),
      publisher: uri(DIA),
      pubCs: literal("Digitální a informační agentura", "cs"),
    }]
    expect(mapCandidateRows(rows)).toEqual([{
      id: DATASET_A,
      title: { cs: "Pohlaví", en: "Sex" },
      groupLabel: { cs: "Digitální a informační agentura" },
    }])
  })

  test("orders the candidates by the sort key and then by IRI", () => {
    const rows: SparqlRow[] = [
      { dataset: uri(DATASET_B), sort: literal("pohlaví - platný od 01.01.2025"), titleCs: literal("B", "cs") },
      { dataset: uri(DATASET_C), sort: literal("pohlaví"), titleCs: literal("C", "cs") },
      { dataset: uri(DATASET_A), sort: literal("pohlaví"), titleCs: literal("A", "cs") },
    ]
    // DATASET_C and DATASET_A have the same sort key, so the lower IRI comes first.
    expect(mapCandidateRows(rows).map((candidate) => candidate.id)).toEqual([DATASET_C, DATASET_A, DATASET_B])
  })

  test("merges the rows of one codelist", () => {
    const rows: SparqlRow[] = [
      { dataset: uri(DATASET_A), sort: literal("a"), titleCs: literal("A", "cs") },
      { dataset: uri(DATASET_A), sort: literal("a"), titleEn: literal("A in English", "en"), pubCs: literal("DIA", "cs") },
    ]
    expect(mapCandidateRows(rows)).toEqual([
      { id: DATASET_A, title: { cs: "A", en: "A in English" }, groupLabel: { cs: "DIA" } },
    ])
  })

  test("titles a codelist without a title by its IRI", () => {
    expect(mapCandidateRows([{ dataset: uri(DATASET_A) }])[0].title).toEqual({ "": DATASET_A })
  })

  test("skips rows without a codelist", () => {
    expect(mapCandidateRows([{ sort: literal("a") }])).toEqual([])
  })
})
