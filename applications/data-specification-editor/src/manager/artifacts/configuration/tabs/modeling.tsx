import { DeepPartial } from "@dataspecer/core/core/utilities/deep-partial"
import { FormGroup, Grid, Typography, Button, Box, Checkbox, FormControlLabel, List, ListItem } from "@mui/material"
import { FC, useContext, useState } from "react"
import { ClientConfiguration } from "../../../../configuration"
import { CASINGS } from "../../../../editor/operations/context/operation-context"
import { SelectWithDefault, TextFieldWithDefault } from "../ui-components/index"
import { SpecificationContext } from "../../../routes/specification/specification"
import { BulkUpdateDialog } from "./bulk-update-dialog"

const casingsOptions = Object.fromEntries(CASINGS.map(c => [c, c]));

const specialCharactersOptions = {
  "allow": "Allow special characters",
  "remove-diacritics": "Remove diacritics",
  "remove-all": "Remove all special characters",
};

export const Modeling: FC<{
    input: DeepPartial<ClientConfiguration>,
    defaultObject?: ClientConfiguration
    onChange: (options: DeepPartial<ClientConfiguration>) => void,
  }> = ({input, onChange, defaultObject}) => {
    const specificationContext = useContext(SpecificationContext);
    const specification = specificationContext?.[0];
    const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);
    
    return <FormGroup>
      <Typography variant="h6">Technical label naming options</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <SelectWithDefault
            current={input ?? {}}
            itemKey="technicalLabelCasingConvention"
            onChange={onChange}
            default={defaultObject}
            options={casingsOptions}
            label="Casing convention"
          />
        </Grid>
        <Grid item xs={6}>
          <SelectWithDefault
            current={input ?? {}}
            itemKey="technicalLabelSpecialCharacters"
            onChange={onChange}
            default={defaultObject}
            options={specialCharactersOptions}
            label="Special characters handling"
          />
        </Grid>
        <Grid item xs={12}>
          <TextFieldWithDefault
            label="Language"
            current={input ?? {}}
            itemKey="technicalLabelLanguages"
            onChange={onChange}
            default={defaultObject}
          />
        </Grid>
      </Grid>
      <Typography variant="body2" sx={{mt: 1}}>
        Set how technical labels should be generated from class names.
      </Typography>

      {specification?.dataStructures && specification.dataStructures.length > 0 && (
        <Box sx={{mt: 3}}>
          <Typography variant="h6">Apply to existing data structures</Typography>
          <Typography variant="body2" sx={{mt: 1, mb: 2}}>
            Apply the current naming conventions to all existing technical labels in your data structures.
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => setBulkUpdateDialogOpen(true)}
          >
            Bulk update labels...
          </Button>
          <BulkUpdateDialog 
            open={bulkUpdateDialogOpen}
            onClose={() => setBulkUpdateDialogOpen(false)}
            dataStructures={specification.dataStructures}
            currentConfiguration={input ?? {}}
            defaultConfiguration={defaultObject}
          />
        </Box>
      )}
    </FormGroup>
  }