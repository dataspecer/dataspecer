import { type DialogProps } from "../../dialog-api";
import { LanguageString } from "../../../dataspecer/entity-model";
import { EditVisualModelDialogState } from "./edit-visual-model-dialog-state";

type SetLanguageString = (value: LanguageString) => LanguageString;

export interface EditVisualModelDialogController {

  setLabel: (setter: (value: LanguageString) => LanguageString) => void;

  setLabelVisual: (value: string) => void;

  setEntityMainColor: (value: string) => void;

  setProfileOfVisual: (value: string) => void;

  setProfileOfColor: (value: string) => void;

  setDisplayRangeDetail: (value: boolean) => void;

  setDisplayRelationshipProfileArchetype: (value: boolean) => void;

}

export function useEditVisualModelDialogController(
  { changeState }: DialogProps<EditVisualModelDialogState>,
): EditVisualModelDialogController {

  const setLabel = (setter: SetLanguageString): void => {
    changeState((state) => ({ ...state, label: setter(state.label) }));
  };

  const setLabelVisual = (value: string): void => {
    changeState(state => ({ ...state, labelVisual: value }));
  };

  const setEntityMainColor = (value: string): void => {
    changeState(state => ({ ...state, entityMainColor: value }));
  };

  const setProfileOfVisual = (value: string): void => {
    changeState(state => ({ ...state, profileOfVisual: value }));
  };

  const setProfileOfColor = (value: string): void => {
    changeState(state => ({ ...state, profileOfColor: value }));
  };

  const setDisplayRangeDetail = (value: boolean): void => {
    changeState(state => ({ ...state, displayRangeDetail: value }));
  };

  const setDisplayRelationshipProfileArchetype = (value: boolean): void => {
    changeState(state => ({
      ...state,
      displayRelationshipProfileArchetype: value,
    }));
  };

  return {
    setLabel,
    setLabelVisual,
    setEntityMainColor,
    setProfileOfVisual,
    setProfileOfColor,
    setDisplayRangeDetail,
    setDisplayRelationshipProfileArchetype,
  };
}
