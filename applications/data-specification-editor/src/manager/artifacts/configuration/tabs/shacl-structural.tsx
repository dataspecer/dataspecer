import type { StructuralShaclConfiguration, StructuralShaclConfigurationInput } from "@dataspecer/shacl/configuration";
import { FormGroup, Typography } from "@mui/material";
import { FC } from "react";
import { SwitchWithDefault } from "../ui-components/index";

export const ShaclStructural: FC<{
  input: StructuralShaclConfigurationInput;
  defaultObject?: StructuralShaclConfiguration;
  onChange: (options: StructuralShaclConfigurationInput) => void;
}> = ({ input, onChange, defaultObject }) => (
  <FormGroup>
    <Typography variant="subtitle2" component="h4">
      Controlled vocabularies
    </Typography>
    <SwitchWithDefault
      label="Validate concept scheme of SKOS vocabularies"
      current={input}
      itemKey="controlledVocabularyScheme"
      onChange={onChange}
      default={defaultObject}
    />
    <Typography variant="body2" color="text.secondary">
      The value of a SKOS-based vocabulary must state its concept scheme (<code>skos:inScheme</code>).
    </Typography>
  </FormGroup>
);
