import { useMemo } from "react";
import { DialogProps } from "../dialog-api";
import { AssociationDialogState } from "./edit-association-dialog-state";
import {
  type BaseEntityDialogController,
  createBaseEntityDialogController,
} from "../base-entity/base-entity-dialog-controller";
import { configuration } from "../../application";
import {
  type BaseRelationshipDialogController,
  createBaseRelationshipDialogController,
} from "../base-relationship/base-relationship-dialog-controller";
import { EntityRepresentative } from "../utilities/dialog-utilities";
import {
  createVisualColorDialogController,
  type VisualColorDialogController,
} from "../visual-color/visual-color-dialog-controller";

export interface EditAssociationDialogController extends
  BaseEntityDialogController,
  BaseRelationshipDialogController<EntityRepresentative>,
  VisualColorDialogController { }

export function useAssociationDialogController(
  { changeState }: DialogProps<AssociationDialogState>,
): EditAssociationDialogController {
  return useMemo(() => {

    const entityController = createBaseEntityDialogController(
      changeState, configuration().relationshipNameToIri);

    const relationshipController = createBaseRelationshipDialogController(
      changeState);

    return {
      ...entityController,
      ...relationshipController,
      ...createVisualColorDialogController(changeState),
    };
  }, [changeState]);
}
