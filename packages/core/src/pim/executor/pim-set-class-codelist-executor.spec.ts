import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { PimSetClassCodelist } from "../operation/index.ts";
import { executePimSetClassCodelist } from "./pim-set-class-codelist-executor.ts";
import * as PIM from "../pim-vocabulary.ts";

test("Update class codelist.", async () => {
  const operation = new PimSetClassCodelist();
  operation.pimClass = "http://class";
  operation.pimIsCodeList = true;
  operation.pimCodelistUrl = ["http://codelist/1", "http://codelist/2"];

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
  };

  const actual = executePimSetClassCodelist(
    wrapResourcesWithReader(before),
    undefined,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({});
  expect(actual.changed).toEqual({
    "http://class": {
      iri: "http://class",
      types: [PIM.CLASS],
      pimIsCodelist: operation.pimIsCodeList,
      pimCodelistUrl: operation.pimCodelistUrl,
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
