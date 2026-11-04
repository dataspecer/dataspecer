import { describe, expect, test } from "vitest"
import { buildIriPattern, iriPrefixPattern } from "./iri-pattern"

describe("buildIriPattern", () => {
  test("uses the common prefix up to the last slash", () => {
    const pattern = buildIriPattern([
      "https://rpp-opendata.egon.gov.cz/odrpp/zdroj/číselníky/46/položka/1",
      "https://rpp-opendata.egon.gov.cz/odrpp/zdroj/číselníky/46/položka/2",
    ])
    expect(pattern).toBe("^https://rpp-opendata\\.egon\\.gov\\.cz/odrpp/zdroj/číselníky/46/položka/.*$")
  })

  test("cuts the prefix back from the middle of a name", () => {
    expect(buildIriPattern(["http://example.org/list/ab1", "http://example.org/list/ab2"]))
      .toBe("^http://example\\.org/list/.*$")
  })

  test("supports hash separators", () => {
    expect(buildIriPattern(["http://example.org/vocab#a", "http://example.org/vocab#b"]))
      .toBe("^http://example\\.org/vocab#.*$")
  })

  test("escapes regular expression characters in the prefix", () => {
    expect(buildIriPattern(["http://example.org/a+b(1)/x", "http://example.org/a+b(1)/y"]))
      .toBe("^http://example\\.org/a\\+b\\(1\\)/.*$")
  })

  test("produces a pattern that matches the given IRIs", () => {
    const iris = ["https://example.org/c/46/item/1", "https://example.org/c/46/item/2"]
    const regex = new RegExp(buildIriPattern(iris)!)
    expect(iris.every((iri) => regex.test(iri))).toBe(true)
    expect(regex.test("https://example.org/c/47/item/1")).toBe(false)
  })

  test("ignores duplicate IRIs", () => {
    expect(buildIriPattern(["http://example.org/a/1", "http://example.org/a/1"])).toBeNull()
  })

  test("returns null for fewer than two IRIs", () => {
    expect(buildIriPattern([])).toBeNull()
    expect(buildIriPattern(["http://example.org/a/1"])).toBeNull()
  })

  test("returns null when the common prefix is only a host", () => {
    expect(buildIriPattern(["http://example.org/a/1", "http://example.org/b/1"])).toBeNull()
    expect(buildIriPattern(["http://example.org/a", "http://example.org/b"])).toBeNull()
  })

  test("returns null when the IRIs share no prefix", () => {
    expect(buildIriPattern(["http://example.org/a/1", "urn:isbn:2"])).toBeNull()
  })
})

describe("iriPrefixPattern", () => {
  test("matches the IRIs with the prefix and escapes the characters special in a regex", () => {
    const pattern = new RegExp(iriPrefixPattern("http://example.org/a.b/"))
    expect(pattern.test("http://example.org/a.b/CZE")).toBe(true)
    expect(pattern.test("http://example.org/aXb/CZE")).toBe(false)
    expect(pattern.test("http://other.org/a.b/CZE")).toBe(false)
  })
})
