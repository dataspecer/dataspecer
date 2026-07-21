import { BackendPackageService } from "@dataspecer/core-v2/project";
import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { createUpdateEntityOperation } from "@dataspecer/core/operation";
import { loadProjectsMainEntities, type ProjectModelEntity } from "@dataspecer/project-model";
import PowerIcon from "@mui/icons-material/Power";
import { Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Fab, List, ListItem, ListItemButton, ListItemIcon } from "@mui/material";
import React, { useContext, useEffect, useState } from "react";
import { LanguageStringText } from "../../../editor/components/helper/LanguageStringComponents";
import { useToggle } from "../../use-toggle";
import { SpecificationContext, useModelStore } from "./specification";

export const ReuseDataSpecifications: React.FC = () => {
  const dialog = useToggle();

  const specification = useContext(SpecificationContext);
  const modelStore = useModelStore();

  const [selectedSpecificationIds, setSelectedSpecificationIds] = useState<string[]>([]);

  const handleToggle = (value: string) => () => {
    const currentIndex = selectedSpecificationIds.indexOf(value);
    const newChecked = [...selectedSpecificationIds];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setSelectedSpecificationIds(newChecked);
  };

  useEffect(() => {
    if (specification?.importsDataSpecificationIds) {
      setSelectedSpecificationIds(specification?.importsDataSpecificationIds);
    }
  }, [specification?.importsDataSpecificationIds]);

  const save = async () => {
    const transaction = modelStore.transaction([{
      modelId: specification.id,
      operation: createUpdateEntityOperation({ id: specification.id, dataStructuresImportPackages: selectedSpecificationIds } as Partial<Entity> & Pick<Entity, "id">),
    }], {});

    await transaction.confirmation;
    dialog.close();
  };

  const [allSpecifications, setAllSpecifications] = useState<EntityRecord<ProjectModelEntity> | null>(null);

  const openDialog = () => {
    const legacyBackendConnector = new BackendPackageService(import.meta.env.VITE_BACKEND, httpFetch);
    loadProjectsMainEntities(legacyBackendConnector).then((entities) => {
      setAllSpecifications(Object.fromEntries(entities.map(entity => [entity.id, entity] as const)));
    });

    dialog.open();
  };

  return (
    <>
      <Fab variant="extended" size="medium" color={"primary"} onClick={openDialog}>
        <PowerIcon sx={{ mr: 1 }} />
        Set reused data specifications
      </Fab>
      <Dialog open={dialog.isOpen} onClose={dialog.close} maxWidth={"xs"} fullWidth>
        <DialogTitle>Reuse data specifications</DialogTitle>
        <DialogContent>
          {allSpecifications ?
            <List>
              {Object.entries(allSpecifications).map(([, spec]) => (
                <ListItem key={spec.id} disablePadding>
                  <ListItemButton role={undefined} onClick={handleToggle(spec.id)} dense>
                    <ListItemIcon>
                      <Checkbox edge="start" checked={selectedSpecificationIds.includes(spec.id)} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <LanguageStringText from={spec.label} fallback={spec.id} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List> :
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh" gap={2}>
              <CircularProgress />
            </Box>
          }
        </DialogContent>
        <DialogActions>
          <Button onClick={save} fullWidth variant="contained">
            Reuse selected data specifications
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
