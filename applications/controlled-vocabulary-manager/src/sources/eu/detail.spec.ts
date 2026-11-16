import { describe, expect, test } from "vitest"
import type { SparqlRow, SparqlTerm } from "../sparql-client"
import { buildRecord, chooseDistribution, distributionsQuery, recordQuery } from "./detail"

const FILE_TYPE = "http://publications.europa.eu/resource/authority/file-type/"
const DATASET_TYPE = "http://publications.europa.eu/resource/authority/dataset-type/"
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

describe("query builders", () => {
  test("reject a record that is not usable as an IRI", () => {
    expect(() => recordQuery("http://x> } DROP")).toThrow()
    expect(() => distributionsQuery("")).toThrow()
  })
})

describe("chooseDistribution", () => {
  const skosCore = distributionRows("core", "Countries SKOS_CORE distribution", "RDF_XML", "https://example.org/core.rdf")
  const skosAp = distributionRows("ap", "Countries SKOS_AP_EU distribution", "RDF_XML", "https://example.org/ap.rdf")
  const csv = distributionRows("csv", "Countries CSV distribution", "CSV", "https://example.org/countries.csv")
  const turtle = distributionRows("ttl", "Countries Turtle distribution", "RDF_TURTLE", "https://example.org/countries.ttl")

  test("chooses the RDF/XML distribution with the most suitable SKOS variant", () => {
    expect(chooseDistribution([...csv, ...skosAp, ...turtle, ...skosCore])).toEqual({
      format: "RDF/XML",
      accessUrl: "https://example.org/core.rdf",
      downloadUrl: "https://example.org/core.rdf",
    })
  })

  test("chooses the next format when there is no RDF/XML distribution", () => {
    expect(chooseDistribution([...csv, ...turtle])?.format).toBe("Turtle")
    expect(chooseDistribution(csv)?.format).toBe("CSV")
  })

  test("accesses a distribution without an access URL at its download URL", () => {
    const rows: SparqlRow[] = [{ distribution: uri(`${DISTRIBUTION}x`), downloadUrl: uri("https://example.org/x.rdf") }]
    expect(chooseDistribution(rows)).toEqual({ format: "Other", accessUrl: "https://example.org/x.rdf", downloadUrl: "https://example.org/x.rdf" })
  })

  test("puts RDF before other formats and plain SKOS before the profiles, then orders by IRI", () => {
    const rows: SparqlRow[] = [
      ...distributionRows("a", "X IMMC_V3 distribution", "XML"),
      ...distributionRows("b", "X SKOS_AP_ACT distribution", "RDF_XML"),
      ...distributionRows("d", "X SKOS_CORE distribution", "RDF_XML"),
      ...distributionRows("c", "X SKOS_CORE distribution", "RDF_XML"),
      ...distributionRows("e", "X distribution", "ZIP"),
    ]
    expect(chooseDistribution(rows)?.accessUrl).toBe("https://example.org/c")
    expect(chooseDistribution([...rows].reverse())).toEqual(chooseDistribution(rows))
  })

  test("merges the rows of a distribution, which come one per title", () => {
    const rows: SparqlRow[] = [
      distributionRows("a", "Countries SKOS_CORE distribution", "RDF_XML")[0],
      { ...distributionRows("a", "Země SKOS_CORE distribuce", "RDF_XML")[0], title: literal("Země SKOS_CORE distribuce", "cs-t-en-t0-mtec") },
      ...distributionRows("b", "Countries SKOS_AP_EU distribution", "RDF_XML"),
    ]
    expect(chooseDistribution(rows)?.accessUrl).toBe("https://example.org/a")
  })

  test("gives null when there is no distribution with an address", () => {
    expect(chooseDistribution([])).toBeNull()
    expect(chooseDistribution([{ distribution: uri(`${DISTRIBUTION}x`), title: literal("No address", "en") }])).toBeNull()
  })
})

describe("buildRecord", () => {
  test("reads the title, the page, the identifier and the type of the record and chooses the distribution", () => {
    const record = buildRecord(
      [
        { title: literal("Countries", "en") },
        { identifier: literal("country") },
        { type: uri(`${DATASET_TYPE}NAL`) },
        { landingPage: uri("https://example.org/country") },
      ],
      distributionRows("core", "Countries SKOS_CORE distribution", "RDF_XML"),
    )
    expect(record).toEqual({
      title: { en: "Countries" },
      documentationUrl: "https://example.org/country",
      distribution: { format: "RDF/XML", accessUrl: "https://example.org/core", downloadUrl: "https://example.org/core" },
      identifier: "country",
      isNamedAuthorityList: true,
    })
  })

  test("prefers the page to the landing page for the documentation", () => {
    const record = buildRecord([{ landingPage: uri("https://example.org/landing") }, { page: uri("https://example.org/page") }], [])
    expect(record.documentationUrl).toBe("https://example.org/page")
  })

  test("is not a named authority list of another type, and has no distribution without rows", () => {
    const record = buildRecord([{ type: uri(`${DATASET_TYPE}TAXONOMY`) }], [])
    expect(record).toMatchObject({ isNamedAuthorityList: false, distribution: null, identifier: null, documentationUrl: null })
  })
})
