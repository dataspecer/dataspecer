import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmCreateAttribute } from "../operation/index.ts";
import { executeDataPsmCreateAttribute } from "./data-psm-create-attribute-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Create data PSM attribute.", async () => {
  const operation = new DataPsmCreateAttribute();
  operation.dataPsmInterpretation = "attribute";
  operation.dataPsmTechnicalLabel = "name";
  operation.dataPsmHumanLabel = { en: "Label" };
  operation.dataPsmHumanDescription = { en: "Desc" };
  operation.dataPsmOwner = "http://class";
  operation.dataPsmDatatype = "xsd:string";

  const before = {
    "http://schema": {
      iri: "http://schema",
      types: [PSM.SCHEMA],
      dataPsmParts: ["http://class"],
    },
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
      dataPsmParts: [],
    },
  };

  let counter = 0;
  const actual = executeDataPsmCreateAttribute(
    wrapResourcesWithReader(before),
    () => "http://localhost/" + ++counter,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({
    "http://localhost/1": {
      iri: "http://localhost/1",
      types: [PSM.ATTRIBUTE],
      dataPsmInterpretation: operation.dataPsmInterpretation,
      dataPsmTechnicalLabel: operation.dataPsmTechnicalLabel,
      dataPsmHumanLabel: operation.dataPsmHumanLabel,
      dataPsmHumanDescription: operation.dataPsmHumanDescription,
      dataPsmDatatype: operation.dataPsmDatatype,
    },
  });
  expect(actual.changed).toEqual({
    "http://schema": {
      iri: "http://schema",
      types: [PSM.SCHEMA],
      dataPsmParts: ["http://class", "http://localhost/1"],
    },
    "http://class": {
      iri: "http://class",
      types: [PSM.CLASS],
      dataPsmParts: ["http://localhost/1"],
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
