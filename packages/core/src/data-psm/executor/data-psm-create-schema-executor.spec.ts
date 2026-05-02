import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmCreateSchema } from "../operation/index.ts";
import { executeDataPsmCreateSchema } from "./data-psm-create-schema-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Create data PSM schema.", async () => {
  const operation = new DataPsmCreateSchema();
  operation.dataPsmHumanLabel = { en: "Label" };
  operation.dataPsmHumanDescription = { en: "Desc" };

  const before = {};

  let counter = 0;
  const actual = executeDataPsmCreateSchema(
    wrapResourcesWithReader(before),
    () => "http://localhost/" + ++counter,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({
    "http://localhost/1": {
      iri: "http://localhost/1",
      types: [PSM.SCHEMA],
      dataPsmHumanLabel: operation.dataPsmHumanLabel,
      dataPsmHumanDescription: operation.dataPsmHumanDescription,
      dataPsmTechnicalLabel: null,
      dataPsmRoots: [],
      dataPsmParts: [],
    },
  });
  expect(actual.changed).toEqual({});
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
