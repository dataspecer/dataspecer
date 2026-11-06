import { describe, expect, test } from "vitest"
import type { SparqlRow, SparqlTerm } from "../sparql-client"
import { buildDetail, distributionsQuery, mapDistributionRows, recordQuery } from "./detail"

const FILE_TYPE = "http://publications.europa.eu/resource/authority/file-type/"
const DATASET_TYPE = "http://publications.europa.eu/resource/authority/dataset-type/"
const RECORD = "http://data.europa.eu/88u/dataset/country"
const DISTRIBUTION = "http://data.europa.eu/88u/distribution/"

function uri(value: string): SparqlTerm {
  return { type: "uri", value }
}

function literal(value: string, lang?: string): SparqlTerm {
  return lang === undefined ? { type: "literal", value } : { type: "literal", value, "xml:lang": lang }
}

function distributionRows(id: string, title: string, fileType: string, url = `https://example.org/${id}`): SparqlRow[] {
  return [{
    distribution: uri(`${DISTRIBUTION}${id}`),
    title: literal(title, "en"),
    format: uri(`${FILE_TYPE}${fileType}`),
    accessUrl: uri(url),
    downloadUrl: uri(url),
  }]
}

describe("mapDistributionRows", () => {
  test("merges the rows of a distribution, which come one per title", () => {
    const rows: SparqlRow[] = [
      { ...distributionRows("a", "Countries SKOS_CORE distribution", "RDF_XML")[0] },
      { ...distributionRows("a", "Země SKOS_CORE distribuce", "RDF_XML")[0], title: literal("Země SKOS_CORE distribuce", "cs-t-en-t0-mtec") },
    ]
    const [distribution] = mapDistributionRows(rows, true)
    expect(mapDistributionRows(rows, true)).toHaveLength(1)
    expect(distribution).toMatchObject({
      id: `${DISTRIBUTION}a`,
      title: { en: "Countries SKOS_CORE distribution", cs: "Země SKOS_CORE distribuce" },
      format: "RDF/XML",
      readable: true,
      accessUrl: "https://example.org/a",
      downloadUrl: "https://example.org/a",
    })
  })

  test("puts RDF before other formats and plain SKOS before the profiles, then orders by IRI", () => {
    const rows: SparqlRow[] = [
      ...distributionRows("a", "X IMMC_V3 distribution", "XML"),
      ...distributionRows("b", "X SKOS_AP_ACT distribution", "RDF_XML"),
      ...distributionRows("d", "X SKOS_CORE distribution", "RDF_XML"),
      ...distributionRows("c", "X SKOS_CORE distribution", "RDF_XML"),
      ...distributionRows("e", "X distribution", "ZIP"),
    ]
    expect(mapDistributionRows(rows, true).map((distribution) => distribution.id.replace(DISTRIBUTION, "")))
      .toEqual(["c", "d", "b", "a", "e"])
  })

  test("uses the download address when there is no access address", () => {
    const rows: SparqlRow[] = [{ distribution: uri(`${DISTRIBUTION}a`), format: uri(`${FILE_TYPE}CSV`), downloadUrl: uri("https://example.org/a.csv") }]
    expect(mapDistributionRows(rows, false)[0]).toMatchObject({ accessUrl: "https://example.org/a.csv", downloadUrl: "https://example.org/a.csv", format: "CSV", readable: false })
  })

  test("leaves out a distribution without any address", () => {
    expect(mapDistributionRows([{ distribution: uri(`${DISTRIBUTION}a`) }], true)).toEqual([])
  })

  test("calls a distribution without a file type Other", () => {
    const rows: SparqlRow[] = [{ distribution: uri(`${DISTRIBUTION}a`), accessUrl: uri("https://example.org/a") }]
    expect(mapDistributionRows(rows, true)[0].format).toBe("Other")
  })
})

describe("buildDetail", () => {
  const recordRows: SparqlRow[] = [
    { title: literal("Countries and territories Named Authority List", "en") },
    { title: literal("Země a území", "cs-t-en-t0-mtec") },
    { identifier: literal("country") },
    { type: uri(`${DATASET_TYPE}NAL`) },
    { page: uri("https://op.example/page") },
    { landingPage: uri("https://op.example/landing") },
  ]

  test("reads all titles, the identifier and prefers the page to the landing page", () => {
    const detail = buildDetail(RECORD, recordRows, distributionRows("a", "X SKOS_CORE distribution", "RDF_XML"))
    expect(detail).toMatchObject({
      id: RECORD,
      title: { en: "Countries and territories Named Authority List", cs: "Země a území" },
      identifier: "country",
      isNamedAuthorityList: true,
      documentationUrl: "https://op.example/page",
      defaultDistributionId: `${DISTRIBUTION}a`,
    })
  })

  test("falls back to the landing page for the documentation", () => {
    const rows = recordRows.filter((row) => row.page === undefined)
    expect(buildDetail(RECORD, rows, []).documentationUrl).toBe("https://op.example/landing")
  })

  test("marks the distributions of a named authority list as readable and those of other types as not", () => {
    const distributions = distributionRows("a", "X distribution", "RDF_XML")
    expect(buildDetail(RECORD, recordRows, distributions).distributions[0].readable).toBe(true)
    const taxonomy = recordRows.map((row) => row.type ? { type: uri(`${DATASET_TYPE}TAXONOMY`) } : row)
    const detail = buildDetail(RECORD, taxonomy, distributions)
    expect(detail.isNamedAuthorityList).toBe(false)
    expect(detail.distributions[0].readable).toBe(false)
  })

  test("has no preselected distribution and no documentation for a record without them", () => {
    const detail = buildDetail(RECORD, [], [])
    expect(detail).toMatchObject({ title: {}, identifier: null, documentationUrl: null, distributions: [], defaultDistributionId: null })
  })
})

describe("query builders", () => {
  test("reject a record that is not usable as an IRI", () => {
    expect(() => recordQuery("http://x> } DROP")).toThrow()
    expect(() => distributionsQuery("")).toThrow()
  })
})
