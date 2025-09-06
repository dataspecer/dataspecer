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
  CmeOperationArguments,
  CmeOperationResult,
} from "../../operation";
import {
  CmeExecutionContext,
  register,
} from "../../operation-registry";
import {
  executeCreateProfileOperation,
  findProfileModel,
} from "../operation-utilities";

const CreateProfileClassType =
  "create-profile-class-operation";

register(
  CreateProfileClassType,
  createProfileClassExecutor,
  "Create a class profile",
  "Create a class profile in the given model."
);

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

export type CreateProfileClassOperation = [
  CreateProfileClassArguments, CreateProfileClassResult];

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * @throws DataspecerError
 */
export async function createProfileClassExecutor(
  context: CmeExecutionContext,
  args: CreateProfileClassArguments,
): Promise<CreateProfileClassResult> {
  const model = findProfileModel(context, args);

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
  });

  const result = await executeCreateProfileOperation(model, operation);
  return {
    args,
    created: (result as CreatedEntityOperationResult).id,
  };
}
