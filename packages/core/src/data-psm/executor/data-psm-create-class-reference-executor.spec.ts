import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmCreateClassReference } from "../operation/index.ts";
import { executeDataPsmCreateClassReference } from "./data-psm-create-class-reference-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Create data PSM class reference.", async () => {
  const operation = new DataPsmCreateClassReference();
  operation.dataPsmSpecification = "http://example.com/remote";
  operation.dataPsmClass = "http://example.com/class";
  operation.dataPsmNewIri = "http://localhost/1";

  const before = {
    "http://schema": {
      iri: "http://schema",
      types: [PSM.SCHEMA],
      dataPsmParts: ["http://base"],
    },
  };

  let counter = 0;
  const actual = executeDataPsmCreateClassReference(
    wrapResourcesWithReader(before),
    () => "http://localhost/" + ++counter,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({
    "http://localhost/1": {
      iri: "http://localhost/1",
      types: [PSM.CLASS_REFERENCE],
      dataPsmSpecification: operation.dataPsmSpecification,
      dataPsmClass: operation.dataPsmClass,
    },
  });
  expect(actual.changed).toEqual({
    "http://schema": {
      iri: "http://schema",
      types: [PSM.SCHEMA],
      dataPsmParts: ["http://base", "http://localhost/1"],
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
