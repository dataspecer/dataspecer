import { describe, expect, test } from "vitest"
import type { SparqlTerm } from "./sparql-client"
import { escapeSparqlString, toLanguageString } from "./sparql-utils"

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

describe("escapeSparqlString", () => {
  test("escapes quotes, backslashes and line breaks", () => {
    expect(escapeSparqlString('a"b\\c\nd\re\tf')).toBe('a\\"b\\\\c\\nd\\re\\tf')
  })

  test("leaves other text, including Czech letters, as it is", () => {
    expect(escapeSparqlString("Číselník ČSÚ (kód 5103)")).toBe("Číselník ČSÚ (kód 5103)")
  })
})
