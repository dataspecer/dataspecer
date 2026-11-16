import { describe, expect, test } from "vitest"
import type { SparqlRow, SparqlTerm } from "../sparql-client"
import { buildRecord, chooseDistribution, distributionsQuery, recordQuery } from "./detail"

const FILE_TYPE = "http://publications.europa.eu/resource/authority/file-type/"
const DATASET = "https://data.gov.cz/zdroj/datové-sady/17651921/b4d1a4c45c8de735e1a616ce62b4b2bd"
const JSONLD = `${DATASET}/distribuce/1`
const CSV = `${DATASET}/distribuce/2`
const SPARQL = `${DATASET}/distribuce/3`

function uri(value: string): SparqlTerm {
  return { type: "uri", value }
}

function literal(value: string, lang?: string): SparqlTerm {
  return lang === undefined ? { type: "literal", value } : { type: "literal", value, "xml:lang": lang }
}

/**
 * Rows as the endpoint returns them for a codelist published in JSON-LD and
 * CSV, with a SPARQL endpoint.
 */
const rows: SparqlRow[] = [
  { distribution: uri(CSV), title: literal("Číselník v CSV", "cs"), format: uri(`${FILE_TYPE}CSV`), accessUrl: uri("https://example.org/46.csv"), downloadUrl: uri("https://example.org/46.csv") },
  { distribution: uri(CSV), title: literal("Codelist in CSV", "en"), format: uri(`${FILE_TYPE}CSV`), accessUrl: uri("https://example.org/46.csv"), downloadUrl: uri("https://example.org/46.csv") },
  { distribution: uri(SPARQL), title: literal("SPARQL Endpoint"), accessUrl: uri("https://example.org/sparql"), service: uri(`${SPARQL}/service`) },
  { distribution: uri(JSONLD), title: literal("Číselník v JSON-LD", "cs"), format: uri(`${FILE_TYPE}JSON_LD`), accessUrl: uri("https://example.org/46.jsonld"), downloadUrl: uri("https://example.org/46.jsonld") },
]

describe("query builders", () => {
  test("reject a dataset that is not usable as an IRI", () => {
    expect(() => recordQuery("x> } # <y")).toThrow()
    expect(() => distributionsQuery("x> } # <y")).toThrow()
  })
})

describe("chooseDistribution", () => {
  const withoutJsonLd = rows.filter((row) => row.distribution?.value !== JSONLD)

  test("chooses the JSON-LD distribution", () => {
    expect(chooseDistribution(rows)).toEqual({
      format: "JSON-LD",
      accessUrl: "https://example.org/46.jsonld",
      downloadUrl: "https://example.org/46.jsonld",
    })
  })

  test("chooses the best of the other formats when there is no JSON-LD distribution, a SPARQL endpoint last", () => {
    expect(chooseDistribution(withoutJsonLd)).toEqual({
      format: "CSV",
      accessUrl: "https://example.org/46.csv",
      downloadUrl: "https://example.org/46.csv",
    })
    expect(chooseDistribution(withoutJsonLd.filter((row) => row.distribution?.value === SPARQL))).toEqual({
      format: "SPARQL",
      accessUrl: "https://example.org/sparql",
      downloadUrl: null,
    })
  })

  test("merges the rows of a distribution with more titles and does not depend on the order of the rows", () => {
    expect(chooseDistribution([...rows].reverse())).toEqual(chooseDistribution(rows))
  })

  test("uses the download URL as the access URL when there is no other", () => {
    const only = [{ distribution: uri(CSV), format: uri(`${FILE_TYPE}CSV`), downloadUrl: uri("https://example.org/46.csv") }]
    expect(chooseDistribution(only)?.accessUrl).toBe("https://example.org/46.csv")
  })

  test("gives null when there is no distribution with an address", () => {
    expect(chooseDistribution([])).toBeNull()
    expect(chooseDistribution([{ distribution: uri(CSV), title: literal("No address", "en") }])).toBeNull()
  })
})

describe("buildRecord", () => {
  test("has no documentation page and no distribution when there are none", () => {
    expect(buildRecord([{ title: literal("A", "cs") }], [])).toEqual({ title: { cs: "A" }, documentationUrl: null, distribution: null })
  })

  test("reads the title and the page of the record and chooses the distribution", () => {
    const record = buildRecord(
      [{ title: literal("Pohlaví", "cs") }, { page: uri("https://example.org/docs.html") }],
      rows,
    )
    expect(record).toMatchObject({
      title: { cs: "Pohlaví" },
      documentationUrl: "https://example.org/docs.html",
      distribution: { format: "JSON-LD" },
    })
  })
})
