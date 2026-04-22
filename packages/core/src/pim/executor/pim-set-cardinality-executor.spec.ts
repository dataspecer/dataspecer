import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import * as PIM from "../pim-vocabulary.ts";
import { executePimSetCardinality } from "./pim-set-cardinality-executor.ts";
import { PimSetCardinality } from "../operation/index.ts";

test("Update cardinality.", async () => {
  const operation = new PimSetCardinality();
  operation.pimResource = "http://localhost/1";
  operation.pimCardinalityMin = 0;
  operation.pimCardinalityMax = 2;

  const before = {
    "http://schema": {
      iri: "http://schema",
      types: [PIM.SCHEMA],
      pimParts: ["http://class", "http://localhost/1"],
    },
    "http://class": {
      iri: "http://class",
      types: [PIM.CLASS],
    },
    "http://localhost/1": {
      iri: "http://localhost/1",
      types: [PIM.ATTRIBUTE],
      pimOwnerClass: "http://class",
      pimDatatype: "xsd:string",
    },
  };

  const actual = executePimSetCardinality(
    wrapResourcesWithReader(before),
    undefined,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({});
  expect(actual.changed).toEqual({
    "http://localhost/1": {
      iri: "http://localhost/1",
      types: [PIM.ATTRIBUTE],
      pimOwnerClass: "http://class",
      pimDatatype: "xsd:string",
      pimCardinalityMin: 0,
      pimCardinalityMax: 2,
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
