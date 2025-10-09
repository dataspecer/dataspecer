import { DeepPartial } from "@dataspecer/core/core/utilities/deep-partial";
import { XmlConfiguration } from "@dataspecer/xml/configuration";
import { FormGroup, Typography, Grid } from "@mui/material";
import { FC } from "react";
import { SwitchWithDefault, TextFieldWithDefault } from "../ui-components/index";

export const Xml: FC<{
  input: DeepPartial<XmlConfiguration>;
  defaultObject?: XmlConfiguration;
  onChange: (options: DeepPartial<XmlConfiguration>) => void;
}> = ({ input, onChange, defaultObject }) => {
  return (
    <FormGroup>
      <Typography variant="subtitle2" component="h3">
        XML structure
      </Typography>
      <Grid container rowGap={1}>
        <Grid item xs={12}>
          <SwitchWithDefault label="Extract all types" current={input ?? {}} itemKey="extractAllTypes" onChange={onChange} default={defaultObject} />
        </Grid>
        <Grid item xs={12}>
          <SwitchWithDefault label="Use attributes instead of elements for IRIs of classes" current={input ?? {}} itemKey="elementIriAsAttribute" onChange={onChange} default={defaultObject} />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" component="h3" sx={{ mt: 3 }}>
        Annotations
      </Typography>
      <Grid container rowGap={1}>
        <Grid item xs={12}>
          <SwitchWithDefault label="Generate sawsdl" current={input ?? {}} itemKey="generateSawsdl" onChange={onChange} default={defaultObject} />
        </Grid>
        <Grid item xs={12}>
          <SwitchWithDefault label="Generate type annotations" current={input ?? {}} itemKey="generateTypeAnnotations" onChange={onChange} default={defaultObject} />
        </Grid>
        <Grid item xs={12}>
          <SwitchWithDefault label="Generate element annotations" current={input ?? {}} itemKey="generateElementAnnotations" onChange={onChange} default={defaultObject} />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" component="h3" sx={{ mt: 3 }}>
        Common XML Schema
      </Typography>
      <TextFieldWithDefault label="Common XML Schema external URL" current={input ?? {}} itemKey="commonXmlSchemaExternalLocation" onChange={onChange} default={defaultObject} />
      <Typography variant="body2" sx={{ my: 0 }}>
        Leave empty if you wish to bundle the schema with other artifacts.
      </Typography>
    </FormGroup>
  );
};
