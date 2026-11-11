import { describe, expect, test } from "vitest"
import { carriesSkos, formatName, formatRank, variantRank } from "./distribution"

const FILE_TYPE = "http://publications.europa.eu/resource/authority/file-type/"

describe("formatName", () => {
  test("names the file types of the catalog", () => {
    expect(formatName(`${FILE_TYPE}RDF_XML`)).toBe("RDF/XML")
    expect(formatName(`${FILE_TYPE}RDF_TURTLE`)).toBe("Turtle")
    expect(formatName(`${FILE_TYPE}CSV`)).toBe("CSV")
  })

  test("uses the code of a file type without a name", () => {
    expect(formatName(`${FILE_TYPE}ZIP`)).toBe("ZIP")
    expect(formatName(`${FILE_TYPE}RDF`)).toBe("RDF")
  })

  test("names a distribution without a file type Other", () => {
    expect(formatName(undefined)).toBe("Other")
  })
})

describe("carriesSkos", () => {
  test("is true for the RDF formats including the generic RDF", () => {
    for (const format of ["RDF/XML", "Turtle", "RDF"]) {
      expect(carriesSkos(format)).toBe(true)
    }
  })

  test("is false for the other formats", () => {
    for (const format of ["CSV", "XML", "ZIP", "XLS", "XLSX", "JSON", "HTML", "Other"]) {
      expect(carriesSkos(format)).toBe(false)
    }
  })
})

describe("formatRank", () => {
  test("puts RDF/XML before Turtle, generic RDF, CSV, XML, JSON and the rest", () => {
    const formats = ["ZIP", "JSON", "XML", "CSV", "RDF", "Turtle", "RDF/XML"]
    expect([...formats].sort((a, b) => formatRank(a) - formatRank(b))).toEqual(
      ["RDF/XML", "Turtle", "RDF", "CSV", "XML", "JSON", "ZIP"],
    )
  })
})

describe("variantRank", () => {
  test("prefers plain SKOS to the application profiles", () => {
    const rank = (title: string) => variantRank({ en: `Countries ${title} distribution` })
    expect(rank("SKOS_CORE")).toBeLessThan(rank("SKOS_AP_EU"))
    expect(rank("SKOS_AP_EU")).toBeLessThan(rank("SKOS_AP_ACT"))
    expect(rank("SKOS_AP_ACT")).toBeLessThan(rank("IMMC_V3"))
  })

  test("falls back to the first title when there is no English one", () => {
    expect(variantRank({ cs: "Země SKOS_CORE distribuce" })).toBe(0)
  })

  test("ranks a distribution without a title last", () => {
    expect(variantRank({})).toBe(3)
  })
})
