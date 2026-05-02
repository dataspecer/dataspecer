import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmSetHumanDescription } from "../operation/index.ts";
import { executeDataPsmSetHumanDescription } from "./data-psm-set-human-description-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Update data PSM resource human description.", async () => {
  const operation = new DataPsmSetHumanDescription();
  operation.dataPsmResource = "http://class";
  operation.dataPsmHumanDescription = { cs: "popis" };

  const before = {
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
    },
  };

  const actual = executeDataPsmSetHumanDescription(
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
      dataPsmHumanDescription: operation.dataPsmHumanDescription,
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
