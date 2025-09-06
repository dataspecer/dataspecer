import { DialogDetailRow } from "../../../components/dialog/dialog-detail-row";
import { DialogProps } from "../../../dialog/dialog-api";
import { ProfileModelState } from "./profile-model-dialog-state";
import { SelectModel } from "../../../dialog/components/select-model";
import {
  useProfileModelDialogController,
 } from "./profile-model-dialog-controller";
import { t } from "../../../application";


export function ProfileModelDialog(props: DialogProps<ProfileModelState>) {
  const controller = useProfileModelDialogController(props);
  const state = props.state;
  return (
    <>
      <div
        className="grid gap-y-2 md:grid-cols-[25%_75%] md:gap-y-3 bg-slate-100 md:pb-4 md:pl-8 md:pr-16 md:pt-2"
        style={{ backgroundColor: state.sourceModel.color }}>
        <DialogDetailRow detailKey={t("profile-model-dialog.source-model")}>
          <SelectModel
            language={state.language}
            items={state.models}
            value={state.sourceModel}
            onChange={controller.setSourceModel}
          />
        </DialogDetailRow>
      </div>

      <div
        className="grid gap-y-2 md:grid-cols-[25%_75%] md:gap-y-3 bg-slate-100 md:pb-4 md:pl-8 md:pr-16 md:pt-2"
        style={{ backgroundColor: state.targetModel.color }}>
        <DialogDetailRow detailKey={t("profile-model-dialog.target-model")}>
          <SelectModel
            language={state.language}
            items={state.models}
            value={state.targetModel}
            onChange={controller.setTargetModel}
          />
        </DialogDetailRow>
      </div>
    </>
  )
}
