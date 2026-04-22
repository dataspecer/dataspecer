import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { PimSetTechnicalLabel } from "../operation/index.ts";
import { executePimSetTechnicalLabel } from "./pim-set-technical-label-executor.ts";
import * as PIM from "../pim-vocabulary.ts";

test("Update resource technical label.", async () => {
  const operation = new PimSetTechnicalLabel();
  operation.pimResource = "http://localhost/1";
  operation.pimTechnicalLabel = "NewLabel";

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
      pimTechnicalLabel: "OldLabel",
    },
  };

  const actual = executePimSetTechnicalLabel(
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
      pimTechnicalLabel: "NewLabel",
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
