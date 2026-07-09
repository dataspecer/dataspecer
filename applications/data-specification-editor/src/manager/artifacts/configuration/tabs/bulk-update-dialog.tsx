import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  FormControl, 
  FormLabel, 
  RadioGroup, 
  FormControlLabel, 
  Radio,
  Typography,
  Alert,
  Checkbox,
  List,
  ListItem,
  Box
} from "@mui/material";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import { BulkUpdateTechnicalLabels, BulkUpdateMode } from "../../../../editor/operations/bulk-update-technical-labels";
import { OperationContext } from "../../../../editor/operations/context/operation-context";
import { DeepPartial } from "@dataspecer/core/core/utilities/deep-partial";
import { ClientConfiguration, ClientConfigurator } from "../../../../configuration";

interface DataStructure {
  id: string;
  label?: Record<string, string>;
  psmSchemaIri?: string;
}

export const BulkUpdateDialog: FC<{
  open: boolean;
  onClose: () => void;
  dataStructures: DataStructure[];
  currentConfiguration: DeepPartial<ClientConfiguration>;
  defaultConfiguration?: ClientConfiguration;
}> = ({ open, onClose, dataStructures, currentConfiguration, defaultConfiguration }) => {
  const { t } = useTranslation("detail");
  const [mode, setMode] = useState<BulkUpdateMode>("apply-style");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStructures, setSelectedStructures] = useState<Set<string>>(new Set(dataStructures.map(ds => ds.id)));
  const store = useFederatedObservableStore();

  const toggleStructure = (id: string) => {
    const newSelected = new Set(selectedStructures);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStructures(newSelected);
  };

  const toggleAll = () => {
    if (selectedStructures.size === dataStructures.length) {
      setSelectedStructures(new Set());
    } else {
      setSelectedStructures(new Set(dataStructures.map(ds => ds.id)));
    }
  };

  const handleUpdate = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Merge configurations
      const mergedConfig = ClientConfigurator.merge(
        defaultConfiguration || {},
        currentConfiguration
      );
      
      const casingConvention = mergedConfig.technicalLabelCasingConvention || "snake_case";
      
      // Create operation context for reset mode
      let context: OperationContext | null = null;
      if (mode === "reset") {
        context = new OperationContext();
        context.labelRules = {
          languages: (mergedConfig.technicalLabelLanguages || "cs").split(",").map(l => l.trim()),
          namingConvention: casingConvention,
          specialCharacters: mergedConfig.technicalLabelSpecialCharacters || "allow",
        };
      }
      
      // Execute bulk update for each selected data structure
      for (const ds of dataStructures) {
        if (selectedStructures.has(ds.id) && ds.psmSchemaIri) {
          const operation = new BulkUpdateTechnicalLabels(
            ds.psmSchemaIri,
            mode,
            casingConvention,
            context
          );
          await store.executeComplexOperation(operation);
        }
      }
      
      onClose();
    } catch (err) {
      console.error("Error during bulk update:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStructureLabel = (ds: DataStructure): string => {
    if (ds.label) {
      // Try to get label in order of preference
      return ds.label["en"] || ds.label["cs"] || Object.values(ds.label)[0] || ds.id;
    }
    return ds.id;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("bulk update technical labels.dialog title")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 3 }}>
          {t("bulk update technical labels.description")}
        </Typography>
        
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend">{t("bulk update technical labels.mode label")}</FormLabel>
          <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as BulkUpdateMode)}>
            <FormControlLabel
              value="apply-style"
              control={<Radio />}
              label={
                <div>
                  <Typography variant="body1">
                    <strong>{t("bulk update technical labels.apply style title")}</strong> {t("bulk update technical labels.apply style subtitle")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("bulk update technical labels.apply style description")}
                  </Typography>
                </div>
              }
            />
            <FormControlLabel
              value="reset"
              control={<Radio />}
              label={
                <div>
                  <Typography variant="body1"><strong>{t("bulk update technical labels.reset title")}</strong></Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("bulk update technical labels.reset description")}
                  </Typography>
                </div>
              }
            />
          </RadioGroup>
        </FormControl>

        <Box sx={{ mb: 2 }}>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">Select data structures to update</FormLabel>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedStructures.size === dataStructures.length}
                  indeterminate={selectedStructures.size > 0 && selectedStructures.size < dataStructures.length}
                  onChange={toggleAll}
                />
              }
              label={<strong>All data structures</strong>}
            />
            <List dense>
              {dataStructures.map((ds) => (
                <ListItem key={ds.id} sx={{ pl: 4 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedStructures.has(ds.id)}
                        onChange={() => toggleStructure(ds.id)}
                      />
                    }
                    label={getStructureLabel(ds)}
                  />
                </ListItem>
              ))}
            </List>
          </FormControl>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isProcessing}>{t("bulk update technical labels.cancel")}</Button>
        <Button 
          onClick={handleUpdate} 
          variant="contained" 
          disabled={isProcessing || selectedStructures.size === 0}
        >
          {isProcessing ? t("bulk update technical labels.updating") : t("bulk update technical labels.update")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
