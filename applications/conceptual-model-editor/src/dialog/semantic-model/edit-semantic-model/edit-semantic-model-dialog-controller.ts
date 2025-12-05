import { HexColor } from "@dataspecer/visual-model";
import { DialogProps } from "../../dialog-api";
import { EditSemanticModelDialogState } from "./edit-semantic-model-dialog-state";

export interface EditSemanticModelDialogController {

  setLabel: (value: string) => void;

  setColor: (value: HexColor) => void;

  setBaseIri: (value: string) => void;

}

export function useEditSemanticModelDialogController(
  { changeState }: DialogProps<EditSemanticModelDialogState>,
): EditSemanticModelDialogController {

  const setLabel = (value: string) => changeState(state => ({
    ...state,
    label: value,
  }));

  const setColor = (value: string) => changeState(state => ({
    ...state,
    color: value,
  }));

  const setBaseIri = (value: string) => changeState(state => ({
    ...state,
    baseIri: value,
  }));

  return {
    setLabel,
    setColor,
    setBaseIri,
  };
}
