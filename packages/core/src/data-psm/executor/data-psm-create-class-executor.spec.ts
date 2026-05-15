import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmCreateClass } from "../operation/index.ts";
import { executeDataPsmCreateClass } from "./data-psm-create-class-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Create data PSM class.", async () => {
  const operation = new DataPsmCreateClass();
  operation.dataPsmInterpretation = "class";
  operation.dataPsmTechnicalLabel = "name";
  operation.dataPsmHumanLabel = { en: "Label" };
  operation.dataPsmHumanDescription = { en: "Desc" };
  operation.dataPsmExtends = ["http://base"];

  const before = {
    "http://schema": {
      iri: "http://schema",
      types: [PSM.SCHEMA],
      dataPsmParts: ["http://base"],
    },
    "http://base": {
      iri: "http://base",
      types: [PSM.CLASS],
    },
  };

  let counter = 0;
  const actual = executeDataPsmCreateClass(
    wrapResourcesWithReader(before),
    () => "http://localhost/" + ++counter,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({
    "http://localhost/1": {
      iri: "http://localhost/1",
      types: [PSM.CLASS],
      dataPsmInterpretation: operation.dataPsmInterpretation,
      dataPsmTechnicalLabel: operation.dataPsmTechnicalLabel,
      dataPsmHumanLabel: operation.dataPsmHumanLabel,
      dataPsmHumanDescription: operation.dataPsmHumanDescription,
      dataPsmExtends: operation.dataPsmExtends,
      dataPsmParts: [],
      dataPsmIsClosed: operation.dataPsmIsClosed,
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
