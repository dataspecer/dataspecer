import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmSetTechnicalLabel } from "../operation/index.ts";
import { executeDataPsmSetTechnicalLabel } from "./data-psm-set-technical-label-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Update data PSM resource technical label.", async () => {
  const operation = new DataPsmSetTechnicalLabel();
  operation.dataPsmResource = "http://class";
  operation.dataPsmTechnicalLabel = "technical";

  const before = {
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
    },
  };

  const actual = executeDataPsmSetTechnicalLabel(
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
      dataPsmTechnicalLabel: operation.dataPsmTechnicalLabel,
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
