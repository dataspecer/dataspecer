import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import {
  CreatedEntityOperationResult,
} from "@dataspecer/core-v2/semantic-model/operations";

import {
  EntityDsIdentifier,
  LanguageString,
  ModelDsIdentifier,
} from "../../../dataspecer/entity-model";
import {
  CmeExecutionContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import { cmeOperationExecutorRegistry } from "../../operation-registry";
import {
  executeCreateProfileOperation,
  findProfileModel,
} from "../operation-utilities";

export function createProfileClassOperation(
  args: Omit<CreateProfileClassArguments, "type">,
): CmeOperation<CreateProfileClassArguments, CreateProfileClassResult> {
  return {
    type: CreateProfileClassType,
    ...args,
  };
}

const CreateProfileClassType =
  "create-profile-class-operation";

interface CreateProfileClassArguments extends CmeOperationArguments {

  type: typeof CreateProfileClassType;

  profileModel: ModelDsIdentifier;

  profileOf: EntityDsIdentifier[];

  iri: string | null;

  name: LanguageString | null;

  nameSource: EntityDsIdentifier | null;

  description: LanguageString | null;

  descriptionSource: EntityDsIdentifier | null;

  usageNote: LanguageString | null;

  usageNoteSource: EntityDsIdentifier | null;

  externalDocumentationUrl: string | null;

  tags: string[];

}

interface CreateProfileClassResult
  extends CmeOperationResult<CreateProfileClassArguments> {

  created: EntityDsIdentifier;

}

cmeOperationExecutorRegistry.register(
  CreateProfileClassType,
  createProfileClassOperation,
  { execute: createProfileClassExecutor });

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws DataspecerError
 */
export async function createProfileClassExecutor(
  context: CmeExecutionContext,
  args: CreateProfileClassArguments,
): Promise<CreateProfileClassResult> {
  const model = findProfileModel(context, args.profileModel);

  const operation = factory.createClassProfile({
    iri: args.iri,
    profiling: args.profileOf,
    name: args.name,
    nameFromProfiled: args.nameSource,
    description: args.description,
    descriptionFromProfiled: args.descriptionSource,
    usageNote: args.usageNote,
    usageNoteFromProfiled: args.usageNoteSource,
    externalDocumentationUrl: args.externalDocumentationUrl,
    tags: args.tags,
    controlledVocabularies: [],
  });

  const result = await executeCreateProfileOperation(model, operation);
  return {
    args,
    created: (result as CreatedEntityOperationResult).id,
  };
}
