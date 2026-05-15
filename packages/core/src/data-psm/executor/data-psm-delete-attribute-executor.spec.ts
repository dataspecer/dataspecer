import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmDeleteAttribute } from "../operation/index.ts";
import { executeDataPsmDeleteAttribute } from "./data-psm-delete-attribute-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Delete data PSM attribute.", async () => {
  const operation = new DataPsmDeleteAttribute();
  operation.dataPsmOwner = "http://class";
  operation.dataPsmAttribute = "http://attribute";

  const before = {
    "http://schema": {
      iri: "http://schema",
      types: [PSM.SCHEMA],
      dataPsmParts: ["http://class", "http://attribute"],
    },
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
      dataPsmParts: ["http://attribute"],
    },
    "http://attribute": {
      iri: "http://attribute",
      types: [PSM.ATTRIBUTE],
    },
  };

  const actual = executeDataPsmDeleteAttribute(
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
  expect(actual.deleted).toEqual(["http://attribute"]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
