import { Button } from "@mui/material";
import { FC, useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackendConnectorContext } from "../../../application";
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
  const backendConnector = useContext(BackendConnectorContext);

  const [configuration, setConfiguration] = useState<object>(null);

  useEffect(() => {
    setConfiguration(null);
    backendConnector.getArtifactConfiguration(configurationId).then(setConfiguration);
  }, [backendConnector, configurationId]);

  const update = useCallback(async (configuration: object) => {
    setConfiguration(configuration);
    await backendConnector.updateArtifactConfiguration(configurationId, configuration);
  }, [backendConnector, configurationId]);

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
