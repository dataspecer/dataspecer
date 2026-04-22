import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { PimDeleteAttribute } from "../operation/index.ts";
import { executePimDeleteAttribute } from "./pim-delete-attribute-executor.ts";
import * as PIM from "../pim-vocabulary.ts";

test("Delete attribute.", async () => {
  const operation = new PimDeleteAttribute();
  operation.pimAttribute = "http://localhost/1";

  const before = {
    "http://schema": {
      iri: "http://schema",
      types: [PIM.SCHEMA],
      pimParts: ["http://localhost/1"],
    },
    "http://localhost/1": {
      iri: "http://localhost/1",
      types: [PIM.ATTRIBUTE],
    },
  };

  const actual = executePimDeleteAttribute(
    wrapResourcesWithReader(before),
    undefined,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({});
  expect(actual.changed).toEqual({
    "http://schema": {
      iri: "http://schema",
      types: [PIM.SCHEMA],
      pimParts: [],
    },
  });
  expect(actual.deleted.sort()).toEqual(["http://localhost/1"].sort());
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
