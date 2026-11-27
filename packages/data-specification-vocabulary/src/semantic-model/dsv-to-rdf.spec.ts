import * as N3 from "n3";
import { describe, expect, test } from "vitest";
import { DEFAULT_CONTROLLED_VOCABULARY, type ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";
import { dsvToRdf } from "./dsv-to-rdf.ts";
import type { ApplicationProfile } from "./dsv-model.ts";
import { DSV, RDF } from "./vocabulary.ts";

const PROFILE_IRI = "http://example.com/profile";
const CATALOG_IRI = "http://example.com/controlled-vocabulary-catalog/package-1";
const DSV_CONTROLLED_VOCABULARIES = "https://w3id.org/dsv#controlledVocabularies";

const profile: ApplicationProfile = {
  iri: PROFILE_IRI,
  classProfiles: [],
  datatypePropertyProfiles: [],
  objectPropertyProfiles: [],
} as unknown as ApplicationProfile;

const vocabulary: ControlledVocabulary = {
  ...DEFAULT_CONTROLLED_VOCABULARY,
  id: "voc-1",
  title: { en: "Vocabulary" },
  references: "http://example.com/scheme",
};

async function parse(configuration: Parameters<typeof dsvToRdf>[1]): Promise<N3.Quad[]> {
  return new N3.Parser().parse(await dsvToRdf(profile, configuration));
}

function linksFromProfile(quads: N3.Quad[]): string[] {
  return quads
    .filter((quad) => quad.subject.value === PROFILE_IRI && quad.predicate.value === DSV_CONTROLLED_VOCABULARIES)
    .map((quad) => quad.object.value);
}

describe("dsvToRdf controlled vocabulary catalog link", () => {

  test("The application profile links to the embedded catalog.", async () => {
    const quads = await parse({
      controlledVocabularies: [vocabulary],
      controlledVocabularyCatalogIri: CATALOG_IRI,
    });

    expect(linksFromProfile(quads)).toStrictEqual([CATALOG_IRI]);
    // The linked resource is the catalog written into the same document.
    expect(quads.some((quad) => quad.subject.value === CATALOG_IRI
      && quad.predicate.value === RDF.type.value
      && quad.object.value === "http://www.w3.org/ns/dcat#Catalog")).toBe(true);
    expect(quads.some((quad) => quad.subject.value === PROFILE_IRI
      && quad.predicate.value === RDF.type.value
      && quad.object.value === DSV.ApplicationProfile.value)).toBe(true);
  });

  test("There is no link without controlled vocabularies to embed.", async () => {
    expect(linksFromProfile(await parse({ controlledVocabularyCatalogIri: CATALOG_IRI }))).toStrictEqual([]);
    expect(linksFromProfile(await parse({ controlledVocabularies: [], controlledVocabularyCatalogIri: CATALOG_IRI }))).toStrictEqual([]);
  });

  test("There is no link without a catalog IRI.", async () => {
    expect(linksFromProfile(await parse({ controlledVocabularies: [vocabulary] }))).toStrictEqual([]);
  });

});
