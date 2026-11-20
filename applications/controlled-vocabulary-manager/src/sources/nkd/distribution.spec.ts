import { describe, expect, test } from "vitest"
import { carriesSkos, formatName, formatRank, isReadableFormat } from "./distribution"

const FILE_TYPE = "http://publications.europa.eu/resource/authority/file-type/"

describe("formatName", () => {
  test("names the known file types", () => {
    expect(formatName(`${FILE_TYPE}JSON_LD`, false)).toBe("JSON-LD")
    expect(formatName(`${FILE_TYPE}RDF_TURTLE`, false)).toBe("Turtle")
    expect(formatName(`${FILE_TYPE}CSV`, false)).toBe("CSV")
  })

  test("uses the code of an unknown file type", () => {
    expect(formatName(`${FILE_TYPE}BIN`, false)).toBe("BIN")
  })

  test("names a distribution without a file type by what it is", () => {
    expect(formatName(undefined, true)).toBe("SPARQL")
    expect(formatName(undefined, false)).toBe("Other")
  })
})

describe("isReadableFormat", () => {
  test("is true only for JSON-LD", () => {
    expect(isReadableFormat("JSON-LD")).toBe(true)
    for (const format of ["Turtle", "RDF/XML", "CSV", "XML", "SPARQL", "Other"]) {
      expect(isReadableFormat(format)).toBe(false)
    }
  })
})

describe("carriesSkos", () => {
  test("is true for the RDF formats and a SPARQL endpoint", () => {
    for (const format of ["JSON-LD", "Turtle", "RDF/XML", "TriG", "N-Triples", "N-Quads", "RDFa", "SPARQL"]) {
      expect(carriesSkos(format)).toBe(true)
    }
  })

  test("is false for the other formats", () => {
    for (const format of ["CSV", "XML", "JSON", "XLSX", "Other"]) {
      expect(carriesSkos(format)).toBe(false)
    }
  })
})

describe("formatRank", () => {
  test("prefers JSON-LD, then the other RDF formats, then tabular and XML ones", () => {
    const formats = ["SPARQL", "CSV", "Turtle", "JSON-LD", "XML", "RDF/XML"]
    expect([...formats].sort((a, b) => formatRank(a) - formatRank(b)))
      .toEqual(["JSON-LD", "Turtle", "RDF/XML", "CSV", "XML", "SPARQL"])
  })

  test("puts an unknown format after the known ones but before the endpoint", () => {
    expect(formatRank("BIN")).toBeGreaterThan(formatRank("JSON"))
    expect(formatRank("BIN")).toBeLessThan(formatRank("SPARQL"))
  })
})
