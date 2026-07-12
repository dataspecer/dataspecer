import type { CoreOperationAndOperation, CoreResourceAndEntity } from "../core/index.ts";
import { type EntityRecord } from "../entity-model/index.ts";
import { applyOperationsToStructureModel } from "./apply-operations.ts";
import * as PSM from "./data-psm-vocabulary.ts";
import { initializeStructureModel } from "./entities.ts";
import { DataPsmCreateClass } from "./operation/index.ts";

/**
 * Applies structure model operations and returns the new state.
 */
function apply(entities: EntityRecord<CoreResourceAndEntity>, operations: CoreOperationAndOperation[]): EntityRecord<CoreResourceAndEntity> {
  const working = { ...entities };
  applyOperationsToStructureModel(working, operations);
  return working;
}

function createClassOperation(iri: string): CoreOperationAndOperation {
  const operation = new DataPsmCreateClass();
  operation.dataPsmNewIri = iri;
  return operation as unknown as CoreOperationAndOperation;
}

test("structure model operations build the model", () => {
  const state = apply({}, [...initializeStructureModel("schema"), createClassOperation("class")]);

  expect(state["schema"].type).toContain(PSM.SCHEMA);
  expect((state["schema"] as unknown as { dataPsmParts: string[] }).dataPsmParts).toEqual(["class"]);
  expect(state["class"].type).toContain(PSM.CLASS);
});
