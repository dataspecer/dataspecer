import { describe, expect, test, vi } from "vitest"
import { SparqlError, type SparqlRow } from "../sparql-client"
import type { SourceDistribution } from "../types"
import type { EuCandidateDetail } from "./detail"
import { authorityListIri, readMetadata } from "./metadata"

const SCHEME = "http://publications.europa.eu/resource/authority/country"
const OPTIONS = { language: "cs" }

function distribution(overrides: Partial<SourceDistribution> = {}): SourceDistribution {
  return {
    id: "d1",
    title: { en: "Countries SKOS_CORE distribution" },
    format: "RDF/XML",
    readable: true,
    accessUrl: "https://op.example/download?file=countries-skos.rdf",
    downloadUrl: "https://op.example/download?file=countries-skos.rdf",
    ...overrides,
  }
}

function detailOf(overrides: Partial<EuCandidateDetail> = {}, ...distributions: SourceDistribution[]): EuCandidateDetail {
  const list = distributions.length > 0 ? distributions : [distribution()]
  return {
    id: "http://data.europa.eu/88u/dataset/country",
    title: { en: "Countries and territories", "": "Země" },
    documentationUrl: "https://op.example/country",
    distributions: list,
    defaultDistributionId: list[0].id,
    identifier: "country",
    isNamedAuthorityList: true,
    ...overrides,
  }
}

function values(...codes: string[]): SparqlRow[] {
  return codes.map((code) => ({ value: { type: "uri", value: `${SCHEME}/${code}` } }))
}

function runReturning(rows: SparqlRow[]) {
  return vi.fn(async () => rows)
}

describe("readMetadata of a named authority list", () => {
  test("derives the scheme IRI from the identifier and the pattern from the values in the catalog", async () => {
    const run = runReturning(values("CZE", "DEU", "FRA", "ITA", "ESP", "POL", "AUT"))
    const result = await readMetadata(detailOf(), "d1", OPTIONS, { run })

    expect(result.warnings).toEqual([])
    expect(result.metadata).toEqual({
      title: { en: "Countries and territories", cs: "Země" },
      pattern: "^http://publications\\.europa\\.eu/resource/authority/country/.*$",
      references: SCHEME,
      conformsToSkos: true,
      documentation: "https://op.example/country",
      distribution: {
        downloadUrl: "https://op.example/download?file=countries-skos.rdf",
        accessUrl: "https://op.example/download?file=countries-skos.rdf",
      },
      iri: null,
    })
    expect(result.sampleIris).toEqual([`${SCHEME}/CZE`, `${SCHEME}/DEU`, `${SCHEME}/FRA`, `${SCHEME}/ITA`, `${SCHEME}/ESP`])
    expect(run).toHaveBeenCalledTimes(1)
  })

  test("leaves the provisional data value out of the example IRIs", async () => {
    const run = runReturning(values("OP_DATPRO", "CZE", "DEU", "FRA"))
    const result = await readMetadata(detailOf(), "d1", OPTIONS, { run })
    expect(result.sampleIris).toEqual([`${SCHEME}/CZE`, `${SCHEME}/DEU`, `${SCHEME}/FRA`])
    expect(result.metadata.pattern).toBe("^http://publications\\.europa\\.eu/resource/authority/country/.*$")
    expect(result.warnings).toEqual([])
  })

  test("uses the pattern of the convention when the provisional data value is all but one of the values", async () => {
    const result = await readMetadata(detailOf(), "d1", OPTIONS, { run: runReturning(values("OP_DATPRO", "CZE")) })
    expect(result.sampleIris).toEqual([])
    expect(result.warnings).toEqual([{ code: "patternByConvention" }])
  })

  test("uses the pattern of the convention, without samples, when the catalog has no values of the list", async () => {
    const result = await readMetadata(detailOf(), "d1", OPTIONS, { run: runReturning([]) })
    expect(result.warnings).toEqual([{ code: "patternByConvention" }])
    expect(result.metadata.references).toBe(SCHEME)
    expect(result.metadata.pattern).toBe("^http://publications\\.europa\\.eu/resource/authority/country/.*$")
    expect(result.sampleIris).toEqual([])
  })

  test("uses the pattern of the convention when there is a single value, from which no pattern is derived", async () => {
    const result = await readMetadata(detailOf(), "d1", OPTIONS, { run: runReturning(values("CZE")) })
    expect(result.warnings).toEqual([{ code: "patternByConvention" }])
    expect(result.metadata.pattern).toBe("^http://publications\\.europa\\.eu/resource/authority/country/.*$")
    expect(result.sampleIris).toEqual([])
  })

  test("returns the pattern of the convention with a warning when the endpoint fails", async () => {
    const run = vi.fn(async () => { throw new SparqlError("network", "Failed to fetch") })
    const result = await readMetadata(detailOf(), "d1", OPTIONS, { run })
    expect(result.warnings).toEqual([{ code: "valuesNotLoaded", detail: "Failed to fetch" }])
    expect(result.metadata.references).toBe(SCHEME)
    expect(result.metadata.pattern).toBe("^http://publications\\.europa\\.eu/resource/authority/country/.*$")
  })

  test("fails when the request is cancelled", async () => {
    const controller = new AbortController()
    controller.abort()
    const run = vi.fn(async () => { throw new SparqlError("aborted", "aborted") })
    await expect(readMetadata(detailOf(), "d1", { ...OPTIONS, signal: controller.signal }, { run })).rejects.toThrow("aborted")
    await expect(readMetadata(detailOf(), "d1", OPTIONS, { run })).rejects.toThrow("aborted")
  })

  test("passes the signal on to the query", async () => {
    const controller = new AbortController()
    const run = runReturning([])
    await readMetadata(detailOf(), "d1", { ...OPTIONS, signal: controller.signal }, { run })
    expect(run).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ signal: controller.signal }))
  })
})

describe("readMetadata of the other vocabularies", () => {
  test("leaves the scheme IRI and the pattern empty with a warning for another type", async () => {
    const run = runReturning([])
    const result = await readMetadata(detailOf({ identifier: "agriprod", isNamedAuthorityList: false }), "d1", OPTIONS, { run })
    expect(result.warnings).toEqual([{ code: "noSchemeIri" }])
    expect(result.metadata).toMatchObject({ references: "", pattern: null, conformsToSkos: true })
    expect(run).not.toHaveBeenCalled()
  })

  test("leaves them empty when the list has no usable identifier", async () => {
    for (const identifier of [null, "a b", "x/../y", ""]) {
      const result = await readMetadata(detailOf({ identifier }), "d1", OPTIONS, { run: runReturning([]) })
      expect(result.warnings).toEqual([{ code: "noSchemeIri" }])
    }
  })

  test("references a vocabulary in a format that is not SKOS by the address of the distribution", async () => {
    const xml = distribution({ id: "x", format: "XML", accessUrl: "https://op.example/c.xml", downloadUrl: "https://op.example/c.xml" })
    const run = runReturning([])
    const result = await readMetadata(detailOf({}, xml), "x", OPTIONS, { run })
    expect(result.warnings).toEqual([])
    expect(result.metadata).toMatchObject({
      references: "https://op.example/c.xml",
      pattern: null,
      conformsToSkos: false,
      distribution: { downloadUrl: "https://op.example/c.xml", accessUrl: "https://op.example/c.xml" },
    })
    expect(run).not.toHaveBeenCalled()
  })

  test("fails for a distribution the record does not have", async () => {
    await expect(readMetadata(detailOf(), "missing", OPTIONS, { run: runReturning([]) })).rejects.toThrow()
  })
})

describe("authorityListIri", () => {
  test("makes the IRI of a list from its identifier", () => {
    expect(authorityListIri("country")).toBe(SCHEME)
    expect(authorityListIri("nace2.1")).toBe("http://publications.europa.eu/resource/authority/nace2.1")
  })

  test("refuses an identifier that is not a plain name", () => {
    expect(authorityListIri("a b")).toBeNull()
    expect(authorityListIri("a/b")).toBeNull()
    expect(authorityListIri("")).toBeNull()
  })
})
