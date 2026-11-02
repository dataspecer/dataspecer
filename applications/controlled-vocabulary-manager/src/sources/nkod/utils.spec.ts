import { describe, expect, test } from "vitest"
import type { SparqlTerm } from "../sparql-client"
import { toLanguageString } from "./utils"

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

  test("keeps the first literal of a language", () => {
    expect(toLanguageString([literal("Pohlaví", "cs"), literal("Rod", "cs-CZ")])).toEqual({ cs: "Pohlaví" })
  })
})
