import { DeepPartial } from "@dataspecer/core/core/utilities/deep-partial";
import { DataSpecificationConfiguration } from "@dataspecer/core/data-specification/configuration";
import { FormGroup, Grid, Typography } from "@mui/material";
import React, { FC } from "react";
import {SelectWithDefault, SwitchWithDefault, TextFieldWithDefault} from "../ui-components/index";
import {InfoHelp} from "../../../../components/info-help";
import {useTranslation} from "react-i18next";

export const DataSpecification: FC<{
  input: DeepPartial<DataSpecificationConfiguration>,
  defaultObject?: DataSpecificationConfiguration,
  onChange: (options: DeepPartial<DataSpecificationConfiguration>) => void,
}> = ({ input, onChange, defaultObject }) => {
  const {t} = useTranslation("detail");

  return <FormGroup>

    <Typography variant="h6">Base URL</Typography>
    <Grid container>
      <Grid item xs={12}>
        <TextFieldWithDefault
          label="URL or keep empty"
          current={input ?? {}}
          itemKey="publicBaseUrl"
          onChange={onChange}
        //default={defaultObject} // no default
        />
      </Grid>
    </Grid>

    <Typography variant="body2" sx={{mt: 1}}>
        For artifacts that will be published on the web.
    </Typography>

    <Typography variant="h6" sx={{ mt: 6 }}>Instance identification and typing</Typography>
    <Grid container spacing={2}>
      <Grid item xs={6} sx={{display: "flex", alignItems: "end"}}>
        <SelectWithDefault
            label="Class instance identification"
            current={input ?? {}}
            itemKey="instancesHaveIdentity"
            onChange={onChange}
            default={defaultObject}
            options={{
              "ALWAYS": "required",
              "OPTIONAL": "optional",
              "NEVER": "disabled",
            }}
        />
        <div><InfoHelp text={t('iri parameters help')} /></div>
      </Grid>
      <Grid item xs={6} sx={{display: "flex", alignItems: "end"}}>
        <SelectWithDefault
            label="Explicit instance typing"
            current={input ?? {}}
            itemKey="instancesSpecifyTypes"
            onChange={onChange}
            default={defaultObject}
            options={{
              "ALWAYS": "required",
              "OPTIONAL": "optional",
              "NEVER": "disabled",
            }}
        />
        <div><InfoHelp text={t('instancesSpecifyTypes.help')} /></div>
      </Grid>
    </Grid>
    <Grid container rowGap={1}  sx={{ mt: 6 }}>
      <Grid item xs={12} sx={{display: "flex", alignItems: "end"}}>
        <SelectWithDefault
            label="Additional class properties"
            current={input ?? {}}
            itemKey="dataPsmIsClosed"
            onChange={onChange}
            default={defaultObject}
            options={{
              "OPEN": "allowed",
              "CLOSED": "disallowed",
            }}
        />
        <div><InfoHelp text={t('class-closed.help')} /></div>
      </Grid>
    </Grid>


    <Typography variant="h6" sx={{ mt: 6 }}>Generated artifacts</Typography>
    <Grid container rowGap={1}>
      <Grid item xs={12}>
        <SwitchWithDefault
          label="JSON (schema, context)"
          current={input.useGenerators ?? {}}
          itemKey="json"
          onChange={(value) => onChange({ ...input, useGenerators: value })}
          default={defaultObject ? (defaultObject?.useGenerators ?? {}) : undefined}
          undefinedIs={true}
        />
      </Grid>
      <Grid item xs={12}>
        <SwitchWithDefault
          label="XML (schema, lifting, lowering)"
          current={input.useGenerators ?? {}}
          itemKey="xml"
          onChange={(value) => onChange({ ...input, useGenerators: value })}
          default={defaultObject ? (defaultObject?.useGenerators ?? {}) : undefined}
          undefinedIs={true}
        />
      </Grid>
      <Grid item xs={12}>
        <SwitchWithDefault
          label="CSV (schema, RDF to CSV)"
          current={input.useGenerators ?? {}}
          itemKey="csv"
          onChange={(value) => onChange({ ...input, useGenerators: value })}
          default={defaultObject ? (defaultObject?.useGenerators ?? {}) : undefined}
          undefinedIs={true}
        />
      </Grid>
      <Grid item xs={12}>
        <SwitchWithDefault
          label="SPARQL queries"
          current={input.useGenerators ?? {}}
          itemKey="sparql"
          onChange={(value) => onChange({ ...input, useGenerators: value })}
          default={defaultObject ? (defaultObject?.useGenerators ?? {}) : undefined}
          undefinedIs={true}
        />
      </Grid>
      <Grid item xs={12}>
        <SwitchWithDefault
            label="SHACL shapes"
            current={input.useGenerators ?? {}}
            itemKey="shacl"
            onChange={(value) => onChange({ ...input, useGenerators: value })}
            default={defaultObject ? (defaultObject?.useGenerators ?? {}) : undefined}
            undefinedIs={true}
        />
      </Grid>
      <Grid item xs={12}>
        <SwitchWithDefault
          label="Bikeshed documentation"
          current={input.useGenerators ?? {}}
          itemKey="bikeshed"
          onChange={(value) => onChange({ ...input, useGenerators: value })}
          default={defaultObject ? (defaultObject?.useGenerators ?? {}) : undefined}
          undefinedIs={true}
        />
      </Grid>
      <Grid item xs={12}>
        <SwitchWithDefault
          label="PlantUML diagrams"
          current={input.useGenerators ?? {}}
          itemKey="plantUML"
          onChange={(value) => onChange({ ...input, useGenerators: value })}
          default={defaultObject ? (defaultObject?.useGenerators ?? {}) : undefined}
          undefinedIs={true}
        />
      </Grid>
      <Grid item xs={12}>
        <SwitchWithDefault
          label="Deprecated Bikeshed documentation"
          current={input.useGenerators ?? {}}
          itemKey="bikeshed@1"
          onChange={(value) => onChange({ ...input, useGenerators: value })}
          default={defaultObject ? (defaultObject?.useGenerators ?? {}) : undefined}
          undefinedIs={false}
        />
      </Grid>
    </Grid>

    <Typography variant="body2" sx={{mt: 1}}>
        Set which families of artifacts should be generated for a given data specification.
    </Typography>

  </FormGroup>;
};
