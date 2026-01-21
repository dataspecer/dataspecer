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
  Alert
} from "@mui/material";
import { FC, useContext, useState } from "react";
import { useFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import { BulkUpdateTechnicalLabels, BulkUpdateMode } from "../../../operations/bulk-update-technical-labels";
import { OperationContext } from "../../../operations/context/operation-context";
import { ClientConfigurator } from "../../../../configuration";
import { SpecificationContext } from "../../../../manager/routes/specification/specification";

export const BulkUpdateTechnicalLabelsDialog: FC<{
  open: boolean;
  onClose: () => void;
  schemaIri: string;
  defaultConfiguration: any;
}> = ({ open, onClose, schemaIri, defaultConfiguration }) => {
  const [mode, setMode] = useState<BulkUpdateMode>("apply-style");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const store = useFederatedObservableStore();
  const [specification] = useContext(SpecificationContext);

  const handleUpdate = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Get the current configuration from specification
      const userPreferences = specification?.userPreferences ?? {};
      const clientConfig = ClientConfigurator.getFromObject(userPreferences);
      
      // Merge with default configuration
      const mergedConfig = ClientConfigurator.merge(
        defaultConfiguration || {},
        clientConfig
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
      
      // Execute the bulk update operation
      const operation = new BulkUpdateTechnicalLabels(
        schemaIri,
        mode,
        casingConvention,
        context
      );
      operation.setStore(store);
      await operation.execute();
      
      onClose();
    } catch (err) {
      console.error("Error during bulk update:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk Update Technical Labels</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 3 }}>
          This will update all technical labels in the current data structure according to the configured casing convention.
        </Typography>
        
        <FormControl component="fieldset">
          <FormLabel component="legend">Update mode</FormLabel>
          <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as BulkUpdateMode)}>
            <FormControlLabel
              value="apply-style"
              control={<Radio />}
              label={
                <div>
                  <Typography variant="body1"><strong>Apply style</strong> (recommended)</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Keeps manual changes but applies the new casing. For example, "jid" becomes "Jid" when changing to PascalCase.
                  </Typography>
                </div>
              }
            />
            <FormControlLabel
              value="reset"
              control={<Radio />}
              label={
                <div>
                  <Typography variant="body1"><strong>Reset</strong></Typography>
                  <Typography variant="body2" color="text.secondary">
                    Regenerates all labels from semantic model, losing any manual changes.
                  </Typography>
                </div>
              }
            />
          </RadioGroup>
        </FormControl>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isProcessing}>Cancel</Button>
        <Button onClick={handleUpdate} variant="contained" disabled={isProcessing}>
          {isProcessing ? "Updating..." : "Update"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
