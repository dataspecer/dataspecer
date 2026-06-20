import SettingsIcon from "@mui/icons-material/Settings";
import type { Entity } from "@dataspecer/core/entity-model";
import { createUpdateEntityOperation } from "@dataspecer/core/operation";
import { Fab } from "@mui/material";
import { FC, useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import { ManagerModelStoreContext, SpecificationContext } from "../../routes/specification/specification";
import { useToggle } from "../../use-toggle";
import { ConfigureDialog } from "./configure-dialog";

/**
 * Renders button and adds logic for updating the configuration.
 * @constructor
 */
export const ConfigureButton: FC = () => {
  const { t } = useTranslation("ui");
  const [specification, updateSpecification] = useContext(SpecificationContext);
  const modelStore = useContext(ManagerModelStoreContext);

  const configuration = specification?.userPreferences ?? {};

  const update = useCallback(
    async (configuration: object) => {
      const userPreferences = { ...specification.userPreferences, ...configuration };
      modelStore.transaction([{
        modelId: specification.iri,
        operation: createUpdateEntityOperation({ id: specification.iri, userPreferences } as Partial<Entity> & Pick<Entity, "id">),
      }], {});
      updateSpecification({ ...specification, userPreferences });
    },
    [modelStore, specification, updateSpecification]
  );

  const ConfigureDialogOpen = useToggle(false);

  return (
    <>
      <Fab variant="extended" size="medium" color={"primary"} onClick={ConfigureDialogOpen.open}>
        <SettingsIcon sx={{ mr: 1 }} />
        {t("configure")}
      </Fab>

      <ConfigureDialog isOpen={ConfigureDialogOpen.isOpen} close={ConfigureDialogOpen.close} onChange={update} configuration={configuration} />
    </>
  );
};
