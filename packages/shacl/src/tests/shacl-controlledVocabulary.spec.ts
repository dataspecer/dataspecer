import { Readable } from "stream";
import factory from "rdf-ext";
import ParserN3 from "@rdfjs/parser-n3";
import SHACLValidator from "rdf-validate-shacl";
import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model";
import { ShaclAdapter } from "../shacl-adapter.ts";
import ControlledVocabularyModelCreator, { ControlledVocabularyModelOptions } from "./support/ControlledVocabularyModelCreator.ts";
import { loadDataset } from "./support/testSupport.ts";

/**
 * Validates a data file against the generated shapes and returns the severity of every result.
 */
async function validate(
  options: ControlledVocabularyModelOptions,
  dataName: string,
  adapterOptions: { controlledVocabularyScheme?: boolean } = {},
): Promise<string[]> {
  const artefact = new DataSpecificationArtefact();
  artefact.configuration = { publicBaseUrl: "https://example.org/shapes/" };
  const model = new ControlledVocabularyModelCreator(options).createModel();
  const { data } = await new ShaclAdapter(model, null, artefact, adapterOptions).generate();

  const shapes = await factory.dataset().import(new ParserN3({ factory }).import(Readable.from([data])) as any);
  const values = await loadDataset(`src/tests/data/controlledVocabulary/${dataName}.ttl`);
  const report = await new SHACLValidator(shapes).validate(values);
  return report.results.map(result => result.severity!.value.replace("http://www.w3.org/ns/shacl#", ""));
}

describe.each(["iri", "class"] as const)("Controlled vocabularies of %s values", (valueKind) => {

  test("must: every value has to be from the vocabulary", async () => {
    const options = { valueKind, qualifier: "must" } as const;
    expect(await validate(options, "allFromVocabulary")).toEqual([]);
    expect(await validate(options, "someFromVocabulary")).toEqual(["Violation"]);
    expect(await validate(options, "noneFromVocabulary")).toEqual(["Violation"]);
  });

  test("at-least-one: a warning only if no value is from the vocabulary", async () => {
    const options = { valueKind, qualifier: "at-least-one" } as const;
    expect(await validate(options, "allFromVocabulary")).toEqual([]);
    expect(await validate(options, "someFromVocabulary")).toEqual([]);
    expect(await validate(options, "noneFromVocabulary")).toEqual(["Warning"]);
  });

  test("recommended: nothing is validated by default", async () => {
    const options = { valueKind, qualifier: "recommended" } as const;
    expect(await validate(options, "noneFromVocabulary")).toEqual([]);
  });

  test("recommended: restriction applies to every value", async () => {
    const options = { valueKind, qualifier: "recommended", restrictToRecommended: true } as const;
    expect(await validate(options, "allFromVocabulary")).toEqual([]);
    expect(await validate(options, "someFromVocabulary")).toEqual(["Warning"]);
  });

  test("recommended: requirement applies to at least one value", async () => {
    const options = { valueKind, qualifier: "recommended", requireRecommended: true } as const;
    expect(await validate(options, "someFromVocabulary")).toEqual([]);
    expect(await validate(options, "noneFromVocabulary")).toEqual(["Warning"]);
  });

  test("concept scheme is validated only when enabled", async () => {
    const options = { valueKind, qualifier: "must" } as const;
    expect(await validate(options, "missingScheme")).toEqual([]);
    expect(await validate(options, "missingScheme", { controlledVocabularyScheme: true })).toEqual(["Violation"]);
    expect(await validate(options, "allFromVocabulary", { controlledVocabularyScheme: true })).toEqual([]);
  });

  test("not applied to a property with several types", async () => {
    const options = { valueKind, qualifier: "must", multipleTypes: true } as const;
    expect(await validate(options, "noneFromVocabulary")).toEqual([]);
  });

});

test("Controlled vocabularies are not applied to blank nodes", async () => {
  const options = { valueKind: "class", qualifier: "must", identity: "NEVER" } as const;
  expect(await validate(options, "blankNode")).toEqual([]);
});

test("A value of a class without properties has to be an IRI node, not a literal", async () => {
  const options = { valueKind: "iri", qualifier: "may" } as const;
  expect(await validate(options, "allFromVocabulary")).toEqual([]);
  expect(await validate(options, "literalValue")).toEqual(["Violation"]);
});
