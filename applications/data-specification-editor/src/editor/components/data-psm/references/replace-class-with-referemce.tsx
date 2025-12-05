import { SCHEMA } from "@dataspecer/core/data-psm/data-psm-vocabulary";
import { DataPsmClass } from "@dataspecer/core/data-psm/model/data-psm-class";
import type { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import { useFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import { useResource } from "@dataspecer/federated-observable-store-react/use-resource";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { MenuItem } from "@mui/material";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useDialog } from "../../../dialog";
import { useAsyncMemo } from "../../../hooks/use-async-memo";
import { ReplaceStructuralClassWithReference } from "../../../operations/replace-structural-class-with-reference";
import { ReplaceWithReferenceDialog } from "./replace-with-reference-dialog";

interface ReplaceClassWithReferenceProps {
  /**
   * Class id to be potentially replaced with a reference.
   */
  structuralClassId: string;

  /**
   * Owning entity such as OR or AssociationEnd.
   */
  owningStructuralEntityId: string;
}

/**
 * For given structural class it creates a menu button to replace it with a reference.
 * It is expected to be used inside OR block.
 * It only provides the replacement for the same conceptual class.
 */
export const ReplaceClassWithReference: FC<ReplaceClassWithReferenceProps> = (props) => {
  const store = useFederatedObservableStore();
  const { t } = useTranslation("psm");

  const { resource } = useResource<DataPsmClass>(props.structuralClassId);
  const interpretation = resource?.dataPsmInterpretation;

  const [availableClassesForReferencing] = useAsyncMemo(async () => {
    const result: string[] = [];

    if (interpretation) {
      // List all PSM schemas from linked stores
      const schemas = await store.listResourcesOfType(SCHEMA);

      for (const schemaIri of schemas) {
        const schema = (await store.readResource(schemaIri)) as DataPsmSchema;
        if (schema === null) continue;
        for (const rootIri of schema.dataPsmRoots) {
          const root = await store.readResource(rootIri);

          // This is a simple lookup that does not check ORs in the root or external roots.
          // We probably do not want to support ORs here.
          if (DataPsmClass.is(root)) {
            if (root.dataPsmInterpretation === null) continue;
            if (root.dataPsmInterpretation === interpretation) {
              result.push(schemaIri);
            }
          }
        }
      }
    }

    return result;
  }, [interpretation]);

  const execute = (dataPsmSchemaIri: string) => {
    const op = new ReplaceStructuralClassWithReference(props.structuralClassId, props.owningStructuralEntityId, dataPsmSchemaIri);
    store.executeComplexOperation(op).then();
  };

  const ReplaceDialog = useDialog(ReplaceWithReferenceDialog);

  return (
    <>
      {availableClassesForReferencing && availableClassesForReferencing.length > 0 && (
        <MenuItem
          onClick={() =>
            ReplaceDialog.open({
              roots: availableClassesForReferencing as string[],
              onSelect: execute,
            })
          }
          title={t("replace with reference.title")}
        >
          <AutorenewIcon />
        </MenuItem>
      )}
      <ReplaceDialog.Component />
    </>
  );
};
