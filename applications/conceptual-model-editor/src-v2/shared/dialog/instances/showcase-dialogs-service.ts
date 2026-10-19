// Service to register a showcase function that opens all dialogs
import { DialogApiContext } from "../dialog-context";
import { DialogApiContextType } from "../dialog-service";
import { useContext, useEffect } from "react";

import { openClassProfileCreateDialog } from "./class-profile-create-dialog/class-profile-create-dialog-service";
import { openRelationshipProfileCreateDialog } from "./relationship-profile-create-dialog/relationship-profile-create-dialog-service";
import { openAttributeProfileCreateDialog } from "./attribute-profile-create-dialog/attribute-profile-create-dialog-service";
import { openClassCreateDialog } from "./class-create-dialog/class-create-dialog-service";
import { openRelationshipCreateDialog } from "./relationship-create-dialog/relationship-create-dialog-service";
import { openAttributeCreateDialog } from "./attribute-create-dialog/attribute-create-dialog-service";

/** Registers `window.showcaseDialogs()` which opens all six dialogs in sequence. */
export function useRegisterShowcaseDialogsToWindow(): void {
  const dialogs = useContext(DialogApiContext);

  useEffect(() => {
    if (!dialogs) return;
    (window as any).showcaseDialogs = () => {
      // Open each dialog. They will appear one after another as the dialog system queues them.
      openClassProfileCreateDialog(dialogs as DialogApiContextType);
      openRelationshipProfileCreateDialog(dialogs as DialogApiContextType);
      openAttributeProfileCreateDialog(dialogs as DialogApiContextType);
      openClassCreateDialog(dialogs as DialogApiContextType);
      openRelationshipCreateDialog(dialogs as DialogApiContextType);
      openAttributeCreateDialog(dialogs as DialogApiContextType);
    };
    return () => {
      delete (window as any).showcaseDialogs;
    };
  }, [dialogs]);
}
