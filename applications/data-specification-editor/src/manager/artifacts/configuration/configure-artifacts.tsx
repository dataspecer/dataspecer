import { createSetEntityOperation } from "@dataspecer/core/operation";
import { Button } from "@mui/material";
import { FC, useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ManagerModelStoreContext } from "../../routes/specification/specification";
import { useToggle } from "../../use-toggle";
import { ConfigureArtifactsDialog } from "./configure-artifacts-dialog";

/**
 * Renders button and adds logic for updating the configuration.
 * @constructor
 */
export const ConfigureArtifacts: FC<{
  dataSpecificationId: string,
  configurationId: string,
}> = ({configurationId}) => {
  const {t} = useTranslation("ui");
  const modelStore = useContext(ManagerModelStoreContext);

  const [configuration, setConfiguration] = useState<object>(null);

  useEffect(() => {
    const entity = modelStore.getAllEntities()[configurationId]?.[configurationId] as unknown as Record<string, unknown> | undefined;
    const data: Record<string, unknown> = { ...entity };
    delete data.id;
    delete data.type;
    setConfiguration(data);
  }, [modelStore, configurationId]);

  const update = useCallback(async (configuration: object) => {
    setConfiguration(configuration);
    modelStore.transaction([{
      modelId: configurationId,
      operation: createSetEntityOperation({ id: configurationId, type: [], ...configuration }),
    }], {});
  }, [modelStore, configurationId]);

  const configureArtifactsDialogOpen = useToggle(false);

  return <>
    <Button
      onClick={configureArtifactsDialogOpen.open}
      disabled={!configuration}
    >
      {t("configure artifacts")}
    </Button>

    <ConfigureArtifactsDialog
      isOpen={configureArtifactsDialogOpen.isOpen}
      close={configureArtifactsDialogOpen.close}
      onChange={update}
      configuration={configuration ?? {}}
    />
  </>
}
