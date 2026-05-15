import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmSetRoots } from "../operation/index.ts";
import { executeDataPsmSetRoots } from "./data-psm-set-roots-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Set data PSM class as a schema root.", async () => {
  const operation = new DataPsmSetRoots();
  operation.dataPsmRoots = ["http://class"];

  const before = {
    "http://schema": {
      iri: "http://schema",
      types: [PSM.SCHEMA],
      dataPsmParts: ["http://class"],
    },
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
    },
  };

  const actual = executeDataPsmSetRoots(
    wrapResourcesWithReader(before),
    undefined,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({});
  expect(actual.changed).toEqual({
    "http://schema": {
      iri: "http://schema",
      types: [PSM.SCHEMA],
      dataPsmRoots: operation.dataPsmRoots,
      dataPsmParts: ["http://class"],
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
