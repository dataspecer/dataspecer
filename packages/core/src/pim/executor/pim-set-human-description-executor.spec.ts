import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { PimSetHumanDescription } from "../operation/index.ts";
import { executePimSetHumanDescription } from "./pim-set-human-description-executor.ts";
import * as PIM from "../pim-vocabulary.ts";

test("Update resource human description.", async () => {
  const operation = new PimSetHumanDescription();
  operation.pimResource = "http://localhost/1";
  operation.pimHumanDescription = { cs: "Popis" };

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
      pimHumanDescription: { en: "Description" },
    },
  };

  const actual = executePimSetHumanDescription(
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
      pimHumanDescription: { cs: "Popis" },
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
