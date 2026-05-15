import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmDeleteClassReference } from "../operation/index.ts";
import { executeDataPsmDeleteClassReference } from "./data-psm-delete-class-reference-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Delete data PSM class.", async () => {
  const operation = new DataPsmDeleteClassReference();
  operation.dataPsmClassReference = "http://class";

  const before = {
    "http://schema": {
      iri: "http://schema",
      types: [PSM.SCHEMA],
      dataPsmRoots: [],
      dataPsmParts: ["http://class"],
    },
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS_REFERENCE],
      dataPsmSpecification: "",
    },
  };

  const actual = executeDataPsmDeleteClassReference(
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
      dataPsmRoots: [],
      dataPsmParts: [],
    },
  });
  expect(actual.deleted).toEqual(["http://class"]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
