import { useActions } from "../../../../action/actions-react-binding";
import { LanguageString } from "../../../../dataspecer/entity-model";
import { DialogProps } from "../../../../dialog/dialog-api";
import { useMemo } from "react";

export interface EditVisualDiagramNodeDialogState {

  representedVisualModelIdentifier: string | null,

  representedVisualModelName: LanguageString,

  language: string,

}

export interface EditVisualDiagramNodeDialogController {

  setRepresentedVisualModelName: (setter: (value: LanguageString) => LanguageString) => void;

  openChangeReferencedVisualModel: () => void;

}

export function useEditVisualDiagramNodeDialogController(
  { changeState }: DialogProps<EditVisualDiagramNodeDialogState>,
): EditVisualDiagramNodeDialogController {
  const { openCreateModelDialog } = useActions();

  return useMemo(() => {

    const setRepresentedVisualModelName = (setter: (value: LanguageString) => LanguageString): void => {
      changeState((state) => ({ ...state, representedVisualModelName: setter(state.representedVisualModelName) }));
    };

    const openChangeReferencedVisualModel = (): void => {
      openCreateModelDialog();
    };

    return {
      setRepresentedVisualModelName,
      openChangeReferencedVisualModel,
    };
  }, [changeState, openCreateModelDialog]);
}
