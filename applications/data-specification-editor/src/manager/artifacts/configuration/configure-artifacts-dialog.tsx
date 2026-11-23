import type { Configuration } from "@dataspecer/core/configuration";
import { SpecificationContext } from "../../routes/specification/specification";
import {Button, Dialog, DialogActions, DialogContent, DialogTitle} from "@mui/material";
import {FC, useContext, useEffect, useState} from "react";
import {DefaultConfigurationContext} from "../../../application";
import {ConfigureArtifactsConfiguration} from "./configure-artifacts-configuration";

/**
 * Dialog that edits configuration.
 */
export const ConfigureArtifactsDialog: FC<{
  isOpen: boolean,
  close: () => void,
  onChange: (configuration: Configuration) => void,
  configuration: Configuration,
}> = ({isOpen, close, onChange, configuration}) => {
  const instanceDefaults = useContext(DefaultConfigurationContext);
  const specification = useContext(SpecificationContext);
  const defaultConfiguration = [...instanceDefaults, specification.configurationChain[0] ?? {}];
  const [localConfiguration, setLocalConfiguration] = useState(() => ({...configuration}));
  useEffect(() => {
    if (isOpen) {
      setLocalConfiguration({...configuration});
    }
  }, [isOpen, configuration]);

  return <Dialog
    open={isOpen}
    onClose={close}
    maxWidth="md"
    fullWidth
  >
    <DialogTitle>
      Configure artifacts
    </DialogTitle>
    <DialogContent>
      <ConfigureArtifactsConfiguration
          defaultConfiguration={defaultConfiguration}
          configuration={localConfiguration}
          onConfigurationChange={setLocalConfiguration}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={close}>Discard</Button>
      <Button onClick={() => {
        onChange(localConfiguration);
        close();
      }}>Save</Button>
    </DialogActions>
  </Dialog>;
}
