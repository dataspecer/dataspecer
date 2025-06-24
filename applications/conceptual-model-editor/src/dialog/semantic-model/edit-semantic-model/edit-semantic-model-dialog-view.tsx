import { type DialogProps } from "../../dialog-api";
import { t } from "../../../application";
import { DialogDetailRow } from "../../../components/dialog/dialog-detail-row";
import { EditSemanticModelDialogState } from "./edit-semantic-model-dialog-state";
import { InputText } from "../../components/input-text";
import { useEditSemanticModelDialogController } from "./edit-semantic-model-dialog-controller";
import { SelectColor } from "../../components/select-color";
import { CmeSemanticModelType } from "../../../dataspecer/cme-model";
import { InputAbsoluteIri } from "../../components/input-iri";

//

export function EditSemanticModelDialog(
  props: DialogProps<EditSemanticModelDialogState>,
) {
  const controller = useEditSemanticModelDialogController(props);
  const state = props.state;
  const showExternalModelMessage =
    state.modelType === CmeSemanticModelType.ExternalSemanticModel;
  return (
    <>
      <div className="grid bg-slate-100 pb-2 md:grid-cols-[25%_75%] md:gap-y-3 md:pl-8 md:pr-16 md:pt-2">
        <DialogDetailRow detailKey={t("edit-semantic-model-dialog.label")} className="text-xl" >
          <InputText
            value={state.label}
            onChange={controller.setLabel}
            disabled={state.labelDisabled}
          />
        </DialogDetailRow>
        <DialogDetailRow detailKey={t("edit-semantic-model-dialog.base-iri")} className="text-xl" >
          <InputAbsoluteIri
            value={state.baseIri}
            onChange={controller.setBaseIri}
            disabled={state.baseIriDisabled}
          />
        </DialogDetailRow>
        <DialogDetailRow detailKey={t("edit-semantic-model-dialog.color")} className="text-xl" >
          <SelectColor
            value={state.color}
            onChange={controller.setColor}
          />
        </DialogDetailRow>
      </div>
      {showExternalModelMessage ?
        <div className="p-4 bg-slate-100 text-center">
          {t("edit-semantic-model-dialog.external-model-message")}
        </div> : null}
    </>
  );
};
