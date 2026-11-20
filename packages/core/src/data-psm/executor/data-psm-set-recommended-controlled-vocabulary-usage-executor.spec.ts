import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmSetRecommendedControlledVocabularyUsage } from "../operation/index.ts";
import { executeDataPsmSetRecommendedControlledVocabularyUsage } from "./data-psm-set-recommended-controlled-vocabulary-usage-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}

function operationOf(entityId: string, require: boolean | null, restrict: boolean | null) {
  const operation = new DataPsmSetRecommendedControlledVocabularyUsage();
  operation.entityId = entityId;
  operation.requireRecommendedControlledVocabularyValue = require;
  operation.restrictToRecommendedControlledVocabulary = restrict;
  return operation;
}

test("Update the recommended controlled vocabulary options of a class.", async () => {
  const before = {
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
    },
  };

  const actual = executeDataPsmSetRecommendedControlledVocabularyUsage(
    wrapResourcesWithReader(before),
    undefined,
    operationOf("http://class", true, false)
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({});
  expect(actual.changed).toEqual({
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
      requireRecommendedControlledVocabularyValue: true,
      restrictToRecommendedControlledVocabulary: false,
    },
  });
  expect(actual.deleted).toEqual([]);
});

test("Set the options back to the default of the data specification.", async () => {
  const before = {
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
      requireRecommendedControlledVocabularyValue: true,
      restrictToRecommendedControlledVocabulary: true,
    },
  };

  const actual = executeDataPsmSetRecommendedControlledVocabularyUsage(
    wrapResourcesWithReader(before),
    undefined,
    operationOf("http://class", null, null)
  );

  expect(actual.changed["http://class"]).toMatchObject({
    requireRecommendedControlledVocabularyValue: null,
    restrictToRecommendedControlledVocabulary: null,
  });
});

test("Fail for a missing resource.", async () => {
  const actual = executeDataPsmSetRecommendedControlledVocabularyUsage(
    wrapResourcesWithReader({}),
    undefined,
    operationOf("http://missing", true, true)
  );
  expect(actual.failed).toBeTruthy();
});

test("Fail for a resource that is not a class.", async () => {
  const actual = executeDataPsmSetRecommendedControlledVocabularyUsage(
    wrapResourcesWithReader({
      "http://attribute": { iri: "http://attribute", types: [PSM.ATTRIBUTE] },
    }),
    undefined,
    operationOf("http://attribute", true, true)
  );
  expect(actual.failed).toBeTruthy();
});
