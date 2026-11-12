import { describe, expect, test } from "vitest"
import type { SparqlRow, SparqlTerm } from "./sparql-client"
import { compareText, firstValue, rankIn, termsOf, toLanguageString } from "./sparql-utils"

function literal(value: string, lang?: string): SparqlTerm {
  return lang === undefined ? { type: "literal", value } : { type: "literal", value, "xml:lang": lang }
}

describe("toLanguageString", () => {
  test("keeps two-letter language tags", () => {
    expect(toLanguageString([literal("Pohlaví", "cs"), literal("Sex", "en")])).toEqual({ cs: "Pohlaví", en: "Sex" })
  })

  test("cuts a tag to its primary subtag and lowercases it", () => {
    expect(toLanguageString([literal("Pohlaví", "cs-CZ"), literal("Sex", "EN")])).toEqual({ cs: "Pohlaví", en: "Sex" })
  })

  test("stores a literal without a tag under the empty key", () => {
    expect(toLanguageString([literal("Pohlaví")])).toEqual({ "": "Pohlaví" })
  })

  test("leaves out tags that are not two-letter language codes", () => {
    expect(toLanguageString([literal("Pohlaví", "ces"), literal("Sex", "x-private")])).toEqual({})
  })

  test("leaves out empty literals", () => {
    expect(toLanguageString([literal("  ", "cs"), literal("", "en")])).toEqual({})
  })

  test("prefers the bare language tag to a tag derived from it, whatever the order", () => {
    const derived = literal("Země (strojový překlad)", "cs-t-en-t0-mtec")
    const bare = literal("Země", "cs")
    expect(toLanguageString([derived, bare])).toEqual({ cs: "Země" })
    expect(toLanguageString([bare, derived])).toEqual({ cs: "Země" })
    expect(toLanguageString([derived])).toEqual({ cs: "Země (strojový překlad)" })
  })

  test("keeps the first literal of a language", () => {
    expect(toLanguageString([literal("Pohlaví", "cs"), literal("Rod", "cs-CZ")])).toEqual({ cs: "Pohlaví" })
  })
})

describe("firstValue", () => {
  const rows: SparqlRow[] = [{ a: literal("") }, { b: literal("x") }, { a: literal("first") }, { a: literal("second") }]

  test("gives the first non-empty value of the variable", () => {
    expect(firstValue(rows, "a")).toBe("first")
  })

  test("gives undefined when the variable has no value", () => {
    expect(firstValue(rows, "c")).toBeUndefined()
  })
})

describe("termsOf", () => {
  test("gives the terms of the variable and skips the rows without it", () => {
    const rows: SparqlRow[] = [{ a: literal("one", "en") }, { b: literal("x") }, { a: literal("two") }]
    expect(termsOf(rows, "a")).toEqual([literal("one", "en"), literal("two")])
  })
})

describe("compareText", () => {
  test("orders texts by their code units", () => {
    expect(compareText("a", "b")).toBe(-1)
    expect(compareText("b", "a")).toBe(1)
    expect(compareText("a", "a")).toBe(0)
    expect(compareText("B", "a")).toBe(-1)
  })
})

describe("rankIn", () => {
  test("gives the position in the list, and the length of the list for a value that is not in it", () => {
    expect(rankIn(["x", "y"], "y")).toBe(1)
    expect(rankIn(["x", "y"], "z")).toBe(2)
  })
})
