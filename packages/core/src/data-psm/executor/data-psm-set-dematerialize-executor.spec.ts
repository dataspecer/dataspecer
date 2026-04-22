import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmSetDematerialized } from "../operation/index.ts";
import { executeDataPsmSetDematerialize } from "./data-psm-set-dematerialize-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";
import { DataPsmAssociationEnd, DataPsmClassReference } from "../model/index.ts";

test("Update data PSM association materialized.", async () => {
  const operation = new DataPsmSetDematerialized();
  operation.dataPsmAssociationEnd = "http://association-end";
  operation.dataPsmIsDematerialized = true;

  const before = {
    "http://association-end": {
      iri: "http://association-end",
      types: [PSM.ASSOCIATION_END],
      dataPsmPart: "http://part",
    } as DataPsmAssociationEnd,
    "http://part": {
      iri: "http://part",
      types: [PSM.CLASS_REFERENCE],
    } as DataPsmClassReference,
  };

  const actual = executeDataPsmSetDematerialize(
    wrapResourcesWithReader(before),
    undefined,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({});
  expect(actual.changed).toEqual({
    "http://association-end": {
      iri: "http://association-end",
      types: [PSM.ASSOCIATION_END],
      dataPsmPart: "http://part",
      dataPsmIsDematerialize: operation.dataPsmIsDematerialized,
    } as DataPsmAssociationEnd,
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
