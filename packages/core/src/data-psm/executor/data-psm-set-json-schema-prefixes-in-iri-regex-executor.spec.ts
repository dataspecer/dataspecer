import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmSetJsonSchemaPrefixesInIriRegex } from "../operation/index.ts";
import { executeDataPsmSetJsonSchemaPrefixesInIriRegex } from "./data-psm-set-json-schema-prefixes-in-iri-regex-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Update jsonSchemaPrefixesInIriRegex property.", async () => {
  const operation = new DataPsmSetJsonSchemaPrefixesInIriRegex();
  operation.dataPsmResource = "http://class";
  operation.jsonSchemaPrefixesInIriRegex = {
    usePrefixes: "ALWAYS",
    includeParentPrefixes: true,
  };

  const before = {
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
    },
  };

  const actual = executeDataPsmSetJsonSchemaPrefixesInIriRegex(
    wrapResourcesWithReader(before),
    undefined,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({});
  expect(actual.changed).toEqual({
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
      jsonSchemaPrefixesInIriRegex: operation.jsonSchemaPrefixesInIriRegex,
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
