import { test, expect } from "vitest";
import { JsonSchema, JsonSchemaArray, JsonSchemaConst, JsonSchemaString } from "../json-schema/json-schema-model.ts";
import { createJsonSchemaViewModel } from "./view-adapter.ts";
import { StructureModel } from "@dataspecer/core/structure-model/model/structure-model";
import { ConceptualModel } from "@dataspecer/core/conceptual-model/model/conceptual-model";
import { DefaultJsonConfiguration } from "../configuration.ts";
import { ArtefactGeneratorContext } from "@dataspecer/core/generator/artefact-generator-context";
import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model/data-specification-artefact";

test("Extract required type values from allOf contains constraints", () => {
  // Create a JSON Schema with multiple type constraints
  const arr = new JsonSchemaArray();
  
  // Each type value should be wrapped in a contains structure
  const containsArray1 = new JsonSchemaArray();
  const constProp1 = new JsonSchemaConst();
  constProp1.value = "Tezaurus";
  containsArray1.contains = constProp1;
  containsArray1.items = new JsonSchemaString(null);
  
  const containsArray2 = new JsonSchemaArray();
  const constProp2 = new JsonSchemaConst();
  constProp2.value = "Slovník";
  containsArray2.contains = constProp2;
  containsArray2.items = new JsonSchemaString(null);
  
  arr.allOf = [containsArray1, containsArray2];
  arr.items = new JsonSchemaString(null);
  
  const schema = new JsonSchema();
  schema.root = arr;
  
  // Create minimal structure model and conceptual model
  const structureModel = new StructureModel();
  structureModel.psmIri = "test-structure";
  structureModel.humanLabel = { en: "Test Structure" };
  structureModel.technicalLabel = "test-structure";
  
  const conceptualModel = new ConceptualModel();
  conceptualModel.pimIri = "test-conceptual";
  
  const context = {
    specifications: {},
    structureModels: {},
    conceptualModels: {},
  } as unknown as ArtefactGeneratorContext;
  
  const artefact = {
    iri: "test-artefact",
    publicUrl: "http://example.com/test",
  } as DataSpecificationArtefact;
  
  // Create view model
  const viewModel = createJsonSchemaViewModel({
    structureModel,
    conceptualModel,
    jsonSchema: schema,
    configuration: DefaultJsonConfiguration,
    context,
    artefact,
    languages: ["en"],
  });
  
  // Verify that the root is an array view model
  expect(viewModel.root.type).toBe("array");
  
  // Verify that requiredTypeValues are extracted correctly
  const arrayViewModel = viewModel.root as any;
  expect(arrayViewModel.requiredTypeValues).toBeDefined();
  expect(arrayViewModel.requiredTypeValues).toEqual(["Tezaurus", "Slovník"]);
});

test("No required type values when allOf is empty", () => {
  const arr = new JsonSchemaArray();
  arr.items = new JsonSchemaString(null);
  
  const schema = new JsonSchema();
  schema.root = arr;
  
  const structureModel = new StructureModel();
  structureModel.psmIri = "test-structure";
  structureModel.humanLabel = { en: "Test Structure" };
  structureModel.technicalLabel = "test-structure";
  
  const conceptualModel = new ConceptualModel();
  conceptualModel.pimIri = "test-conceptual";
  
  const context = {
    specifications: {},
    structureModels: {},
    conceptualModels: {},
  } as unknown as ArtefactGeneratorContext;
  
  const artefact = {
    iri: "test-artefact",
    publicUrl: "http://example.com/test",
  } as DataSpecificationArtefact;
  
  const viewModel = createJsonSchemaViewModel({
    structureModel,
    conceptualModel,
    jsonSchema: schema,
    configuration: DefaultJsonConfiguration,
    context,
    artefact,
    languages: ["en"],
  });
  
  const arrayViewModel = viewModel.root as any;
  expect(arrayViewModel.requiredTypeValues).toBeNull();
});

test("Single type value uses contains, not requiredTypeValues", () => {
  // This simulates the array part of a oneOf structure for single type values
  const constProp = new JsonSchemaConst();
  constProp.value = "Tezaurus";
  
  const arr = new JsonSchemaArray();
  arr.contains = constProp;
  arr.items = new JsonSchemaString(null);
  
  const schema = new JsonSchema();
  schema.root = arr;
  
  const structureModel = new StructureModel();
  structureModel.psmIri = "test-structure";
  structureModel.humanLabel = { en: "Test Structure" };
  structureModel.technicalLabel = "test-structure";
  
  const conceptualModel = new ConceptualModel();
  conceptualModel.pimIri = "test-conceptual";
  
  const context = {
    specifications: {},
    structureModels: {},
    conceptualModels: {},
  } as unknown as ArtefactGeneratorContext;
  
  const artefact = {
    iri: "test-artefact",
    publicUrl: "http://example.com/test",
  } as DataSpecificationArtefact;
  
  const viewModel = createJsonSchemaViewModel({
    structureModel,
    conceptualModel,
    jsonSchema: schema,
    configuration: DefaultJsonConfiguration,
    context,
    artefact,
    languages: ["en"],
  });
  
  const arrayViewModel = viewModel.root as any;
  // For single values, contains is used directly, not requiredTypeValues
  expect(arrayViewModel.requiredTypeValues).toBeNull();
  expect(arrayViewModel.contains).toBeDefined();
  expect(arrayViewModel.contains.type).toBe("const");
});
