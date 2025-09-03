import {
  createClass,
  CreatedEntityOperationResult,
} from "@dataspecer/core-v2/semantic-model/operations";

import { isInMemorySemanticModel } from "../../dataspecer/semantic-model";
import {
  EntityDsIdentifier,
  LanguageString,
  ModelDsIdentifier,
} from "../../dataspecer/entity-model";
import {
  CmeOperationArguments,
  CmeOperationResult,
  DataspecerOperationFailed,
} from "../operation";
import {
  CmeExecutionContext,
  register,
} from "../operation-registry";
import { findModel } from "../operation-utilities";

interface CreateSemanticClassArguments extends CmeOperationArguments {

  type: typeof CreateSemanticClassType;

  semanticModel: ModelDsIdentifier;

  iri: string | null;

  name: LanguageString | null;

  description: LanguageString | null;

  externalDocumentationUrl: string | null;

}

const CreateSemanticClassType =
  "create-semantic-class-operation";

interface CreateSemanticClassResult
  extends CmeOperationResult<CreateSemanticClassArguments> {

  created: EntityDsIdentifier;

}

export type CreateSemanticClassOperation = [
  CreateSemanticClassArguments, CreateSemanticClassResult];

export async function createSemanticClassExecutor(
  context: CmeExecutionContext,
  args: CreateSemanticClassArguments,
): Promise<CreateSemanticClassResult> {
  const model = findModel(
    context.semanticModels, isInMemorySemanticModel, args.semanticModel);
  //
  const operation = createClass({
    iri: args.iri,
    name: args.name ?? undefined,
    description: args.description ?? undefined,
    externalDocumentationUrl: args.externalDocumentationUrl ?? null,
  });

  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerOperationFailed();
  }
  return {
    args,
    created: (result as CreatedEntityOperationResult).id,
  };
}

register(
  CreateSemanticClassType,
  createSemanticClassExecutor,
  "Create a semantic class",
  "Create a new semantic class in the given model."
);
