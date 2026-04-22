import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { PimSetHumanLabel } from "../operation/index.ts";
import { executePimSetHumanLabel } from "./pim-set-human-label-executor.ts";
import * as PIM from "../pim-vocabulary.ts";

test("Update resource human label.", async () => {
  const operation = new PimSetHumanLabel();
  operation.pimResource = "http://localhost/1";
  operation.pimHumanLabel = { cs: "Popis" };

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
      pimHumanLabel: { en: "Label" },
    },
  };

  const actual = executePimSetHumanLabel(
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
      pimHumanLabel: { cs: "Popis" },
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
