import { BetterModalProps, } from "@/lib/better-modal";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { MergeState } from "@dataspecer/git";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";
import { useTranslation } from "react-i18next";

export enum DiffEditorOutsideChangeChosenAction {
  Nothing,
  Reload,
  Continue,
}

type ChooseActionForDiffEditorUnplannedChangeProps = {
  oldMergeState: MergeState,
  newMergeState: MergeState,
} & BetterModalProps<{
  result: DiffEditorOutsideChangeChosenAction,
}>;


/**
 * Dialog that handles the special case when we try to store our work in the diff editor, but somebody else modified the data specification from either
 *  different instance of diff editor or other component of Dataspecer
 */
export const ChooseActionForDiffEditorUnplannedChange = ({ oldMergeState, newMergeState, isOpen, resolve }: ChooseActionForDiffEditorUnplannedChangeProps) => {
  const { t } = useTranslation();
  const handleReturn = (chosenResult: DiffEditorOutsideChangeChosenAction) => {
    resolve({ result: chosenResult });
  };

  return (
    <Modal open={isOpen} onClose={() => resolve({ result: DiffEditorOutsideChangeChosenAction.Nothing })}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{t("outside-changes-to-diff-editor-action-dialog.title")}</ModalTitle>
            <ModalDescription>{newMergeState.isUpToDate ? <p>{t("outside-changes-to-diff-editor-action-dialog.description.up-to-date")}</p> : <p>{t("outside-changes-to-diff-editor-action-dialog.description.not-up-to-date")}</p>}</ModalDescription>
          </ModalHeader>
          <div>
            {t("outside-changes-to-diff-editor-action-dialog.working-version-modified-at")} <strong>{new Date(oldMergeState.modifiedDiffTreeAt).toLocaleString()}</strong>
            <br/>
            {t("outside-changes-to-diff-editor-action-dialog.new-version-modified-at")} <strong>{new Date(newMergeState.modifiedDiffTreeAt).toLocaleString()}</strong>
            <br/>
            <br/>
            <strong>{t("outside-changes-to-diff-editor-action-dialog.info.line.one.part-one")}</strong>{t("outside-changes-to-diff-editor-action-dialog.info.line.one.part-two")}
            <br/>
            <strong>{t("outside-changes-to-diff-editor-action-dialog.info.line.two.part-one")}</strong>{t("outside-changes-to-diff-editor-action-dialog.info.line.two.part-two")}
            <br/>
            <div className="flex flex-1 flex-row"><strong>{t("outside-changes-to-diff-editor-action-dialog.info.line.three.part-one")}</strong>&nbsp;{t("outside-changes-to-diff-editor-action-dialog.info.line.three.part-two")}<SaveChangesTooltip/></div>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => handleReturn(DiffEditorOutsideChangeChosenAction.Nothing)}>{t("outside-changes-to-diff-editor-action-dialog.button.cancel")}</Button>
            <Button variant="destructive" onClick={() => handleReturn(DiffEditorOutsideChangeChosenAction.Reload)}>{t("outside-changes-to-diff-editor-action-dialog.button.discard-changes")}</Button>
            <Button variant="destructive" onClick={() => handleReturn(DiffEditorOutsideChangeChosenAction.Continue)}>{t("outside-changes-to-diff-editor-action-dialog.button.save-changes")}</Button>
          </ModalFooter>
        </ModalContent>
    </Modal>
  );
}

export const saveChangesTooltipText: string = "outside-changes-to-diff-editor-action-dialog.save-changes-tooltip-text";

function SaveChangesTooltip() {
  const { t } = useTranslation();
  return <div>
    <PopOverGitGeneralComponent>
      <div>{t(saveChangesTooltipText)}</div>
    </PopOverGitGeneralComponent>
  </div>
}
