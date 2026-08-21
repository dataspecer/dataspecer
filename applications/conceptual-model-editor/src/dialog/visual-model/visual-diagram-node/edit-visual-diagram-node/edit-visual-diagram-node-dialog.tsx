import { DialogProps } from "../../../../dialog/dialog-api";
import {
  EditVisualDiagramNodeDialogState,
  useEditVisualDiagramNodeDialogController
} from "./edit-visual-diagram-node-dialog-controller";
import { t } from "../../../../application";
import { DialogDetailRow } from "../../../../components/dialog/dialog-detail-row";
import { InputLanguageString } from "../../../../dialog/components/input-language-string";

export const EditVisualDiagramNodeDialog = (props: DialogProps<EditVisualDiagramNodeDialogState>) => {
  const controller = useEditVisualDiagramNodeDialogController(props);
  const state = props.state;
  return (
    <>
      <div className="grid bg-slate-100 md:grid-cols-[25%_75%] md:gap-y-3 md:pl-8 md:pr-16 md:pt-2">
        <DialogDetailRow detailKey={t("create-visual-diagram-node-dialog.model-name")}>
          <InputLanguageString
            value={state.representedVisualModelName}
            onChange={controller.setRepresentedVisualModelName}
            defaultLanguage={state.language}
            inputType="text"
          />
        </DialogDetailRow>
      </div>
    </>
  );
};
