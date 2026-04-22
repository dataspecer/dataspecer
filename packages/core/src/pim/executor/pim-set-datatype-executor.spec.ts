import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { PimSetDatatype } from "../operation/index.ts";
import { executePimSetDataType } from "./pim-set-datatype-executor.ts";
import * as PIM from "../pim-vocabulary.ts";

test("Update attribute datatype.", async () => {
  const operation = new PimSetDatatype();
  operation.pimAttribute = "http://localhost/1";
  operation.pimDatatype = "xsd:integer";

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

  const actual = executePimSetDataType(
    wrapResourcesWithReader(before),
    undefined,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({});
  expect(actual.changed).toMatchObject({
    "http://localhost/1": {
      iri: "http://localhost/1",
      types: [PIM.ATTRIBUTE],
      pimOwnerClass: "http://class",
      pimDatatype: "xsd:integer",
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
