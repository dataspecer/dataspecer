import {
  ExternalSemanticModel,
} from "@dataspecer/core-v2/semantic-model/simplified";
import { EntityModel } from "@dataspecer/entity-model";

export {
  ExternalSemanticModel,
} from "@dataspecer/core-v2/semantic-model/simplified";

export function isExternalSemanticModel(
  what: EntityModel,
): what is ExternalSemanticModel {
  return what instanceof ExternalSemanticModel;
}
