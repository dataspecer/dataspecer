import { DialogContent, DialogTitle } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { dialog, DialogParameters } from "../../dialog";
import { CloseDialogButton } from "../detail/components/close-dialog-button";
import { DefaultSearchDialogContent } from "./default-search-dialog-content/default-search-dialog-content";

export const SearchDialog: React.FC<DialogParameters & { selected: (cls: string) => void }> = dialog(
  { maxWidth: "md", fullWidth: true, PaperProps: { sx: { height: "90%" } } },
  (props) => {
    const { t } = useTranslation("search-dialog");

    return (
      <>
        <DialogTitle>
          {t("title")}
          <CloseDialogButton onClick={props.close} />
        </DialogTitle>
        <DialogContent>
            <DefaultSearchDialogContent {...props} />
        </DialogContent>
      </>
    );
  }
);
