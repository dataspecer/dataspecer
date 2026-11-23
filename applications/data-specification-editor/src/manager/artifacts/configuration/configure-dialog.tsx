import type { Configuration } from "@dataspecer/core/configuration";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Tab, Tabs } from "@mui/material";
import { FC, useContext, useEffect, useState } from "react";
import { DefaultConfigurationContext } from "../../../application";
import { getClientConfigInput, clientConfig, resolveClientConfig } from "../../../configuration";
import { Modeling } from "./tabs/modeling";

/**
 * Dialog that edits configuration.
 */
export const ConfigureDialog: FC<{
  isOpen: boolean,
  close: () => void,
  onChange: (configuration: Configuration) => void,
  configuration: Configuration,
}> = ({isOpen, close, onChange, configuration}) => {
  const defaultConfiguration = useContext(DefaultConfigurationContext);
  const [localConfiguration, setLocalConfiguration] = useState(() => ({...configuration}));
  useEffect(() => {
    if (isOpen) {
      setLocalConfiguration({...configuration});
    }
  }, [isOpen, configuration]);

  const [currentTab, setCurrentTab] = useState(0);

  return <Dialog
    open={isOpen}
    onClose={close}
    maxWidth="sm"
    fullWidth
  >
    <DialogTitle>
      Configure
    </DialogTitle>
    <DialogContent>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, i) => setCurrentTab(i)}>
          <Tab label="Modeling" />
        </Tabs>
      </Box>
      {currentTab === 0 &&
        <Modeling
            input={getClientConfigInput(localConfiguration)}
            onChange={u => setLocalConfiguration({ ...localConfiguration, ...clientConfig(u) })}
            defaultObject={resolveClientConfig(defaultConfiguration)}
        />
      }

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
