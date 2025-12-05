import { DialogProps } from "../../dialog-api";
import { ProfileModelState } from "./profile-model-dialog-state";
import { CmeSemanticModel } from "../../../dataspecer/cme-model";

export interface ProfileModelDialogController {

  setSourceModel(value: CmeSemanticModel): void;

  setTargetModel(value: CmeSemanticModel): void;

}

export function useProfileModelDialogController(
  { changeState }: DialogProps<ProfileModelState>,
): ProfileModelDialogController {

  const setSourceModel = (value: CmeSemanticModel) => {
    changeState(prev => ({ ...prev, sourceModel: value }));
  };

  const setTargetModel = (value: CmeSemanticModel) => {
    changeState(prev => ({ ...prev, targetModel: value }));
  };

  return {
    setSourceModel,
    setTargetModel,
  }
}
