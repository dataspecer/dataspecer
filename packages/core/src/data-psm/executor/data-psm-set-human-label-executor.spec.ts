import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmSetHumanLabel } from "../operation/index.ts";
import { executeDataPsmSetHumanLabel } from "./data-psm-set-human-label-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Update data PSM resource human label.", async () => {
  const operation = new DataPsmSetHumanLabel();
  operation.dataPsmResource = "http://class";
  operation.dataPsmHumanLabel = { en: "label" };

  const before = {
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
    },
  };

  const actual = executeDataPsmSetHumanLabel(
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
      dataPsmHumanLabel: operation.dataPsmHumanLabel,
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
