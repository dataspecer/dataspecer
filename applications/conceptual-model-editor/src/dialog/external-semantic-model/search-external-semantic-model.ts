import { DialogWrapper } from "../dialog-api";
import { SearchExternalSemanticModelState } from "./search-external-semantic-model-state";
import { SearchExternalSemanticModelDialog } from "./search-external-semantic-model-view";

export const createSearchExternalSemanticDialog = (
  state: SearchExternalSemanticModelState,
  onConfirm: ((state: SearchExternalSemanticModelState) => void | Promise<void>) | null,
): DialogWrapper<SearchExternalSemanticModelState> => {
  return {
    label: "search-external-semantic-model-dialog.title",
    component: SearchExternalSemanticModelDialog,
    state,
    confirmLabel: "search-external-semantic-model-dialog.ok",
    cancelLabel: "search-external-semantic-model-dialog.cancel",
    validate: () => true,
    onConfirm,
    onClose: null,
  };
};
