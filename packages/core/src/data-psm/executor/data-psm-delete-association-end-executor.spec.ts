import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmDeleteAssociationEnd } from "../operation/index.ts";
import { executeDataPsmDeleteAssociationEnd } from "./data-psm-delete-association-end-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Delete data PSM association-end.", async () => {
  const operation = new DataPsmDeleteAssociationEnd();
  operation.dataPsmOwner = "http://class";
  operation.dataPsmAssociationEnd = "http://association-end";

  const before = {
    "http://schema": {
      iri: "http://schema",
      types: [PSM.SCHEMA],
      dataPsmParts: ["http://class", "http://association-end"],
    },
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
      dataPsmParts: ["http://association-end"],
    },
    "http://association-end": {
      iri: "http://association-end",
      types: [PSM.ASSOCIATION_END],
    },
  };

  const actual = executeDataPsmDeleteAssociationEnd(
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
      dataPsmParts: ["http://class"],
    },
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
      dataPsmParts: [],
    },
  });
  expect(actual.deleted).toEqual(["http://association-end"]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
