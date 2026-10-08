import { DialogWrapper, type DialogProps } from "../dialog-api";
import { GeneralizationDialogState } from "./edit-generalization-dialog-state";
import { useGeneralizationDialogController } from "./edit-generalization-dialog-controller";
import { VisualColorRow } from "../visual-color/visual-color-row";

const GeneralizationDialog = (props: DialogProps<GeneralizationDialogState>) => {
  const controller = useGeneralizationDialogController(props);
  const state = props.state;
  return (
    <div className="grid bg-slate-100 pb-2 md:grid-cols-[25%_75%] md:gap-y-3 md:pl-8 md:pr-16 md:pt-2">
      <VisualColorRow
        state={state}
        controller={controller}
        modelColor={state.modelColor}
      />
    </div>
  );
};

export const createEditGeneralizationDialog = (
  state: GeneralizationDialogState,
  onConfirm: (state: GeneralizationDialogState) => void | null,
): DialogWrapper<GeneralizationDialogState> => {
  return {
    label: "dialog.generalization.label-edit",
    component: GeneralizationDialog,
    state,
    confirmLabel: "dialog.generalization.ok-edit",
    cancelLabel: "dialog.generalization.cancel",
    validate: null,
    onConfirm,
    onClose: null,
  };
};
