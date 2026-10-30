import { describe, expect, test } from "vitest"
import { parseOfnJsonLd } from "./ofn-jsonld"

// The samples are trimmed copies of codelists published in NKOD.

describe("parseOfnJsonLd", () => {
  test("reads a codelist in the current OFN form (DIA, sporty)", () => {
    const codelist = parseOfnJsonLd({
      "@context": "https://ofn.gov.cz/číselníky/2022-02-08/kontexty/číselník.jsonld",
      iri: "https://data.mvcr.gov.cz/zdroj/číselníky/sporty",
      typ: "Číselník",
      název: { cs: "Sporty", en: "Sports" },
      položky: [
        { typ: "Položka", iri: "https://data.mvcr.gov.cz/zdroj/číselníky/sporty/položky/aerobik", kód: "aerobik", název: { cs: "Aerobik" } },
        { typ: "Položka", iri: "https://data.mvcr.gov.cz/zdroj/číselníky/sporty/položky/golf", kód: "golf", název: { cs: "Golf" } },
      ],
    })
    expect(codelist).toEqual({
      schemeIri: "https://data.mvcr.gov.cz/zdroj/číselníky/sporty",
      title: { cs: "Sporty", en: "Sports" },
      itemIris: [
        "https://data.mvcr.gov.cz/zdroj/číselníky/sporty/položky/aerobik",
        "https://data.mvcr.gov.cz/zdroj/číselníky/sporty/položky/golf",
      ],
    })
  })

  test("reads the draft form with id and název-číselníku (ISVaVaI)", () => {
    const codelist = parseOfnJsonLd({
      "@context": "https://ofn.gov.cz/číselníky/draft/schémata/číselníky.context.jsonld",
      id: "https://www.isvavai.cz/dokumenty/opendata/ciselniky/druh-souteze",
      typ: "číselník",
      "název-číselníku": { cs: "Číselník druhů soutěže ve VaVaI" },
      položky: [
        { typ: "položka", id: "https://www.isvavai.cz/dokumenty/opendata/ciselniky/druh-souteze/VS", kód: "VS" },
        { typ: "položka", id: "https://www.isvavai.cz/dokumenty/opendata/ciselniky/druh-souteze/VZ", kód: "VZ" },
      ],
    })
    expect(codelist?.schemeIri).toBe("https://www.isvavai.cz/dokumenty/opendata/ciselniky/druh-souteze")
    expect(codelist?.title).toEqual({ cs: "Číselník druhů soutěže ve VaVaI" })
    expect(codelist?.itemIris).toEqual([
      "https://www.isvavai.cz/dokumenty/opendata/ciselniky/druh-souteze/VS",
      "https://www.isvavai.cz/dokumenty/opendata/ciselniky/druh-souteze/VZ",
    ])
  })

  test("resolves relative ids against @base (MPSV)", () => {
    const codelist = parseOfnJsonLd({
      "@context": {
        id: "@id",
        type: "@type",
        "@base": "https://data.mpsv.cz/zdroj/",
        polozky: { "@reverse": "skos:inScheme", "@container": "@set" },
      },
      id: "ciselnik/DnyVTydnu",
      type: "ciselnik",
      polozky: [
        { id: "DenVTydnu/pon", kod: "pon", nazev: { cs: "Pondělí" } },
        { id: "DenVTydnu/ut", kod: "ut", nazev: { cs: "Úterý" } },
      ],
    })
    expect(codelist).toEqual({
      schemeIri: "https://data.mpsv.cz/zdroj/ciselnik/DnyVTydnu",
      title: {},
      itemIris: ["https://data.mpsv.cz/zdroj/DenVTydnu/pon", "https://data.mpsv.cz/zdroj/DenVTydnu/ut"],
    })
  })

  test("finds @base in a context array", () => {
    const codelist = parseOfnJsonLd({
      "@context": ["https://example.org/context.jsonld", { "@base": "https://example.org/list/" }],
      id: "scheme",
      polozky: [{ id: "a" }, { id: "b" }],
    })
    expect(codelist?.schemeIri).toBe("https://example.org/list/scheme")
    expect(codelist?.itemIris).toEqual(["https://example.org/list/a", "https://example.org/list/b"])
  })

  test("returns no IRIs for a codelist that gives none (MŠMT)", () => {
    const codelist = parseOfnJsonLd({
      "@context": "https://ofn.gov.cz/číselníky/2022-02-08/kontexty/číselník.jsonld",
      typ: "Číselník",
      název: { cs: "Kód změny (pro matriku)" },
      kód: "RAKZ",
      položky: [
        { typ: "Položka", kód: "1", název: { cs: "Nový záznam" } },
        { typ: "Položka", kód: "2", název: { cs: "Změna" } },
      ],
    })
    expect(codelist).toEqual({ schemeIri: null, title: { cs: "Kód změny (pro matriku)" }, itemIris: [] })
  })

  test("keeps a scheme IRI that is the address of the file (ÚOHS)", () => {
    const codelist = parseOfnJsonLd({
      iri: "http://uohs.gov.cz/opendata/ciselniky/odbory.jsonld",
      název: { cs: "Odbory ÚOHS" },
      položky: [{ iri: "https://uohs.gov.cz/cs/hospodarska-soutez.html" }],
    })
    expect(codelist?.schemeIri).toBe("http://uohs.gov.cz/opendata/ciselniky/odbory.jsonld")
    expect(codelist?.itemIris).toEqual(["https://uohs.gov.cz/cs/hospodarska-soutez.html"])
  })

  test("skips items without a resolvable IRI", () => {
    const codelist = parseOfnJsonLd({
      iri: "https://example.org/list",
      položky: [{ iri: "https://example.org/list/a" }, { kód: "b" }, { iri: "relative/c" }, "text", null, { iri: 7 }],
    })
    expect(codelist?.itemIris).toEqual(["https://example.org/list/a"])
  })

  test("does not resolve relative IRIs without a usable base", () => {
    expect(parseOfnJsonLd({ iri: "scheme", položky: [] })).toEqual({ schemeIri: null, title: {}, itemIris: [] })
    expect(parseOfnJsonLd({ "@context": { "@base": "https://example.org/list" }, id: "scheme", polozky: [] })?.schemeIri)
      .toBeNull()
  })

  test("ignores title values that are not language strings", () => {
    expect(parseOfnJsonLd({ iri: "https://example.org/list", název: { cs: "Seznam", en: 5, de: "" } })?.title)
      .toEqual({ cs: "Seznam" })
    expect(parseOfnJsonLd({ iri: "https://example.org/list", název: "Seznam" })?.title).toEqual({})
  })

  test("returns null for documents that are not codelists", () => {
    expect(parseOfnJsonLd(null)).toBeNull()
    expect(parseOfnJsonLd("text")).toBeNull()
    expect(parseOfnJsonLd([{ iri: "https://example.org/a" }])).toBeNull()
    expect(parseOfnJsonLd({ "@context": "https://schema.org", name: "Not a codelist" })).toBeNull()
  })
})
