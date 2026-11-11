import { describe, expect, test } from "vitest"
import { mapDistributions } from "./distributions"
import type { SparqlRow, SparqlTerm } from "./sparql-client"

function uri(value: string): SparqlTerm {
  return { type: "uri", value }
}

function literal(value: string, lang?: string): SparqlTerm {
  return lang === undefined ? { type: "literal", value } : { type: "literal", value, "xml:lang": lang }
}

const kindOf = () => ({ format: "CSV", readable: false })

describe("mapDistributions", () => {
  test("merges the rows of one distribution", () => {
    const rows: SparqlRow[] = [
      { distribution: uri("d1"), title: literal("Soubor", "cs"), downloadUrl: uri("http://x/file") },
      { distribution: uri("d1"), title: literal("File", "en"), accessUrl: uri("http://x/page") },
    ]
    expect(mapDistributions(rows, kindOf)).toEqual([{
      id: "d1",
      title: { cs: "Soubor", en: "File" },
      format: "CSV",
      readable: false,
      accessUrl: "http://x/page",
      downloadUrl: "http://x/file",
    }])
  })

  test("accesses a distribution without an access URL at its download URL", () => {
    const rows: SparqlRow[] = [{ distribution: uri("d1"), downloadUrl: uri("http://x/file") }]
    expect(mapDistributions(rows, kindOf)[0]).toMatchObject({ accessUrl: "http://x/file", downloadUrl: "http://x/file" })
  })

  test("leaves out a distribution without any address, and keeps the order of the rows", () => {
    const rows: SparqlRow[] = [
      { distribution: uri("b"), accessUrl: uri("http://x/b") },
      { distribution: uri("none"), title: literal("No address", "en") },
      { distribution: uri("a"), accessUrl: uri("http://x/a") },
    ]
    expect(mapDistributions(rows, kindOf).map((distribution) => distribution.id)).toEqual(["b", "a"])
  })

  test("asks the source for the kind with the rows and the download URL of the distribution", () => {
    const rows: SparqlRow[] = [
      { distribution: uri("d1"), accessUrl: uri("http://x/endpoint"), service: uri("http://x/service") },
      { distribution: uri("d2"), downloadUrl: uri("http://x/file") },
    ]
    const calls: Array<[number, string | null]> = []
    mapDistributions(rows, (group, downloadUrl) => {
      calls.push([group.length, downloadUrl])
      return { format: "x", readable: true }
    })
    expect(calls).toEqual([[1, null], [1, "http://x/file"]])
  })
})
