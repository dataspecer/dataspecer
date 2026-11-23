import { FormGroup, Grid, Typography } from "@mui/material"
import { FC } from "react"
import { ClientConfiguration, ClientConfigurationInput } from "../../../../configuration"
import { CASINGS } from "../../../../editor/operations/context/operation-context"
import { SelectWithDefault, TextFieldWithDefault } from "../ui-components/index"

const casingsOptions = Object.fromEntries(CASINGS.map(c => [c, c]));

const specialCharactersOptions = {
  "allow": "Allow special characters",
  "remove-diacritics": "Remove diacritics",
  "remove-all": "Remove all special characters",
};

export const Modeling: FC<{
    input: ClientConfigurationInput,
    defaultObject?: ClientConfiguration
    onChange: (options: ClientConfigurationInput) => void,
  }> = ({input, onChange, defaultObject}) => {
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

    </FormGroup>
  }