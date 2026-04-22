import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { PimCreateAssociation, PimCreateAssociationResult } from "../operation/index.ts";
import { executesPimCreateAssociation } from "./pim-create-association-executor.ts";
import * as PIM from "../pim-vocabulary.ts";

test("Create association.", async () => {
  const operation = new PimCreateAssociation();
  operation.pimInterpretation = "attribute";
  operation.pimTechnicalLabel = "name";
  operation.pimHumanLabel = { en: "Label" };
  operation.pimHumanDescription = { en: "Desc" };
  operation.pimAssociationEnds = ["http://left", "http://right"];
  operation.pimIsOriented = true;

  const before = {
    "http://schema": {
      iri: "http://schema",
      types: [PIM.SCHEMA],
      pimParts: ["http://class", "http://left", "http://right"],
    },
    "http://left": {
      iri: "http://left",
      types: [PIM.CLASS],
    },
    "http://right": {
      iri: "http://right",
      types: [PIM.CLASS],
    },
  };

  let counter = 0;
  const actual = executesPimCreateAssociation(
    wrapResourcesWithReader(before),
    () => "http://localhost/" + ++counter,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({
    "http://localhost/3": {
      iri: "http://localhost/3",
      types: [PIM.ASSOCIATION],
      pimInterpretation: operation.pimInterpretation,
      pimTechnicalLabel: operation.pimTechnicalLabel,
      pimHumanLabel: operation.pimHumanLabel,
      pimHumanDescription: operation.pimHumanDescription,
      pimEnd: ["http://localhost/1", "http://localhost/2"],
      pimIsOriented: operation.pimIsOriented,
    },
    "http://localhost/2": {
      iri: "http://localhost/2",
      types: [PIM.ASSOCIATION_END],
      pimInterpretation: null,
      pimHumanDescription: null,
      pimHumanLabel: null,
      pimTechnicalLabel: null,
      pimPart: "http://right",
      pimCardinalityMax: null,
      pimCardinalityMin: null,
    },
    "http://localhost/1": {
      iri: "http://localhost/1",
      types: [PIM.ASSOCIATION_END],
      pimInterpretation: null,
      pimHumanDescription: null,
      pimHumanLabel: null,
      pimTechnicalLabel: null,
      pimPart: "http://left",
      pimCardinalityMax: null,
      pimCardinalityMin: null,
    },
  });
  expect(actual.changed).toEqual({
    "http://schema": {
      iri: "http://schema",
      types: [PIM.SCHEMA],
      pimParts: [
        "http://class",
        "http://left",
        "http://right",
        "http://localhost/3",
        "http://localhost/1",
        "http://localhost/2",
      ],
    },
  });
  expect(actual.deleted).toEqual([]);
  expect(PimCreateAssociationResult.is(actual.operationResult)).toBeTruthy();
  const result = actual.operationResult as PimCreateAssociationResult;
  expect(result.createdPimAssociation).toBe("http://localhost/3");
  expect(result.createdPimAssociationEnds.sort()).toEqual([
    "http://localhost/1",
    "http://localhost/2",
  ]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
