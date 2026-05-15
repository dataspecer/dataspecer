import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmSetInterpretation } from "../operation/index.ts";
import { executeDataPsmSetInterpretation } from "./data-psm-set-interpretation-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Update data PSM resource interpretation.", async () => {
  const operation = new DataPsmSetInterpretation();
  operation.dataPsmResource = "http://class";
  operation.dataPsmInterpretation = "http://interpretation";

  const before = {
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
    },
  };

  const actual = executeDataPsmSetInterpretation(
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
      dataPsmInterpretation: operation.dataPsmInterpretation,
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
