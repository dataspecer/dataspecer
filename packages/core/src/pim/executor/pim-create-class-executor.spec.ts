import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { PimCreateClass, PimCreateClassResult } from "../operation/index.ts";
import { executePimCreateClass } from "./pim-create-class-executor.ts";
import * as PIM from "../pim-vocabulary.ts";

test("Create class.", async () => {
  const operation = new PimCreateClass();
  operation.pimInterpretation = "class-type";
  operation.pimTechnicalLabel = "my-class";
  operation.pimHumanLabel = { en: "Label" };
  operation.pimHumanDescription = { en: "Desc" };

  const before = {
    "http://schema": {
      iri: "http://schema",
      types: [PIM.SCHEMA],
      pimParts: [],
    },
  };

  let counter = 0;
  const actual = executePimCreateClass(
    wrapResourcesWithReader(before),
    () => "http://localhost/" + ++counter,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toMatchObject({
    "http://localhost/1": {
      iri: "http://localhost/1",
      types: [PIM.CLASS],
      pimInterpretation: operation.pimInterpretation,
      pimTechnicalLabel: operation.pimTechnicalLabel,
      pimHumanLabel: operation.pimHumanLabel,
      pimHumanDescription: operation.pimHumanDescription,
      pimExtends: [],
      pimCodelistUrl: [],
      pimIsCodelist: false,
    },
  });
  expect(actual.changed).toEqual({
    "http://schema": {
      iri: "http://schema",
      types: [PIM.SCHEMA],
      pimParts: ["http://localhost/1"],
    },
  });
  expect(actual.deleted).toEqual([]);
  expect(PimCreateClassResult.is(actual.operationResult)).toBeTruthy();
  const result = actual.operationResult as PimCreateClassResult;
  expect(result.createdPimClass).toBe("http://localhost/1");
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
