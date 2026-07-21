import { Button, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { FC, useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import { CloseDialogButton } from "../../editor/components/detail/components/close-dialog-button";
import { LanguageStringText } from "../../editor/components/helper/LanguageStringComponents";
import { dialog } from "../../editor/dialog";
import { PROJECT_MODEL_ID, SpecificationContext, useModelStore } from "../routes/specification/specification";
import { createRemoveModelOperation } from "@dataspecer/project-model";

export const DeleteDataSchemaForm: FC<{
  isOpen: boolean;
  close: () => void;
  dataStructureIri: string;
}> = dialog({ fullWidth: true, maxWidth: "xs" }, ({ close, dataStructureIri }) => {
  const { t } = useTranslation("ui");

  const specification = useContext(SpecificationContext);
  const structure = specification.dataStructures.find((structure) => structure.id === dataStructureIri);

  const modelStore = useModelStore();

  const del = useCallback(async () => {
    const op = modelStore.transaction(
      [{
        operation: createRemoveModelOperation(dataStructureIri),
        modelId: PROJECT_MODEL_ID,
      }],
      {}
    );

    await op.confirmation;
    close();
  }, [close, dataStructureIri, modelStore]);

  return (
    <>
      <DialogTitle>
        {t("deleteDataSchema.title")}
        <CloseDialogButton onClick={close} />
      </DialogTitle>
      <DialogContent>
        <Typography>{t("deleteDataSchema.text")}</Typography>
        <ul>
          <li>
            <strong>
              <LanguageStringText from={structure?.label} fallback={dataStructureIri} />
            </strong>
          </li>
        </ul>
        <Typography>{t("deleteDataSchema.additionalText")}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={del} color="error">
          {t("delete")}
        </Button>
        <Button onClick={close} variant="contained">
          {t("cancel")}
        </Button>
      </DialogActions>
    </>
  );
});
