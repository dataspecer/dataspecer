import { CmeSemanticModelType } from "../../../dataspecer/cme-model";
import { ModelDsIdentifier } from "../../../dataspecer/entity-model";

export interface UiSemanticModel {

  identifier: ModelDsIdentifier;

  /**
   * Type of underlying model representation.
   */
  modelType: CmeSemanticModelType;

  /**
   * Short label representing the entity in the user interface.
   */
  label: string;

  /**
   * Color of the model.
   */
  color: string;

  /**
   * Model is hardcoded.
   */
  buildIn?: boolean;

}
