import { describe, expect, test } from "vitest"
import type { SparqlRow, SparqlTerm } from "../sparql-client"
import { buildDetail, distributionsQuery, mapDistributionRows } from "./detail"

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

describe("mapDistributionRows", () => {
  test("lists the most suitable distribution first and the endpoint last", () => {
    expect(mapDistributionRows(rows).map((distribution) => distribution.format)).toEqual(["JSON-LD", "CSV", "SPARQL"])
  })

  test("maps a file distribution", () => {
    expect(mapDistributionRows(rows)[0]).toEqual({
      id: JSONLD,
      title: { cs: "Číselník v JSON-LD" },
      format: "JSON-LD",
      readable: true,
      accessUrl: "https://example.org/46.jsonld",
      downloadUrl: "https://example.org/46.jsonld",
    })
  })

  test("merges the rows of a distribution with more titles", () => {
    const csv = mapDistributionRows(rows).find((distribution) => distribution.id === CSV)
    expect(csv?.title).toEqual({ cs: "Číselník v CSV", en: "Codelist in CSV" })
    expect(csv?.readable).toBe(false)
  })

  test("maps an endpoint to a distribution that cannot be downloaded", () => {
    const endpoint = mapDistributionRows(rows).find((distribution) => distribution.id === SPARQL)
    expect(endpoint).toMatchObject({ format: "SPARQL", readable: false, accessUrl: "https://example.org/sparql", downloadUrl: null })
  })

  test("uses the download URL as the access URL when there is no other", () => {
    const [distribution] = mapDistributionRows([
      { distribution: uri(CSV), format: uri(`${FILE_TYPE}CSV`), downloadUrl: uri("https://example.org/46.csv") },
    ])
    expect(distribution.accessUrl).toBe("https://example.org/46.csv")
  })

  test("leaves out a distribution without any address", () => {
    expect(mapDistributionRows([{ distribution: uri(CSV), format: uri(`${FILE_TYPE}CSV`) }])).toEqual([])
  })

  test("does not depend on the order of the rows", () => {
    expect(mapDistributionRows([...rows].reverse())).toEqual(mapDistributionRows(rows))
  })
})

describe("buildDetail", () => {
  const recordRows: SparqlRow[] = [
    { title: literal("Pohlaví - platný od 01.01.1900", "cs") },
    { title: literal("Sex - valid from 01.01.1900", "en") },
    { page: uri("https://data.dia.gov.cz/soubory/číselníky/pohlaví.html") },
  ]

  test("collects the titles, the documentation page and the distributions", () => {
    const detail = buildDetail(DATASET, recordRows, rows)
    expect(detail.id).toBe(DATASET)
    expect(detail.title).toEqual({ cs: "Pohlaví - platný od 01.01.1900", en: "Sex - valid from 01.01.1900" })
    expect(detail.documentationUrl).toBe("https://data.dia.gov.cz/soubory/číselníky/pohlaví.html")
    expect(detail.distributions).toHaveLength(3)
  })

  test("preselects the most suitable distribution", () => {
    expect(buildDetail(DATASET, recordRows, rows).defaultDistributionId).toBe(JSONLD)
  })

  test("has no documentation page and no preselected distribution when there are none", () => {
    const detail = buildDetail(DATASET, [{ title: literal("A", "cs") }], [])
    expect(detail.documentationUrl).toBeNull()
    expect(detail.defaultDistributionId).toBeNull()
  })

  test("rejects a dataset IRI that is not safe", () => {
    expect(() => distributionsQuery("x> } # <y")).toThrow()
  })
})
