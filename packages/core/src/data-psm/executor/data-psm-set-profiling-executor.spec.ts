import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmSetProfiling } from "../operation/index.ts";
import { executeDataPsmSetProfiling } from "./data-psm-set-profiling-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Update data PSM resource profiling.", async () => {
  const operation = new DataPsmSetProfiling();
  operation.dataPsmResource = "http://class";
  operation.dataPsmProfiling = ["one", "two"];

  const before = {
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
    },
  };

  const actual = await executeDataPsmSetProfiling(
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
      profiling: operation.dataPsmProfiling,
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
