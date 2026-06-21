import { DeepPartial } from "@dataspecer/core/core/utilities/deep-partial";
import { DataSpecificationConfiguration } from "@dataspecer/core/data-specification/configuration";
import { FormControl, FormGroup, FormHelperText, Input, InputLabel, Typography } from "@mui/material";
import { cloneDeep } from "lodash";
import { FC, useContext } from "react";
import { useSearchParams } from "react-router-dom";
import { BackendConnectorContext, DefaultConfigurationContext } from "../../../../application";
import { getDefaultConfigurators } from "../../../../configurators";
import { getConfiguration } from "../../../../configuration/provided-configuration";
import { useAsyncMemo } from "../../../../editor/hooks/use-async-memo";
import { ArtifactConfigurator } from "@dataspecer/specification/v1";
import { SpecificationContext } from "../../../routes/specification/specification";

const artefactTitle = {
  "http://example.com/generator/json-schema": {
      cs: "JSON schéma",
      en: "JSON schema",
  },
  "https://schemas.dataspecer.com/generator/json-example": {
      cs: "Příklad JSONu",
      en: "JSON example",
  },
  "http://dataspecer.com/generator/json-ld": {
      cs: "JSON-LD kontext",
      en: "JSON-LD context",
  },
  "http://example.com/generator/xml-common-schema": {
      cs: "XML sdílené koncepty",
      en: "XML shared concepts",
  },
  "http://example.com/generator/xml-schema": {
      cs: "XML schéma",
      en: "XML schema",
  },
  "http://example.com/generator/xslt-lifting": {
      cs: "XSLT lifting",
      en: "XSLT lifting",
  },
  "http://example.com/generator/xslt-lowering": {
      cs: "XSLT lowering",
      en: "XSLT lowering",
  },
  "http://example.com/generator/csv-schema": {
      cs: "CSV schéma",
      en: "CSV schema",
  },
  "http://example.com/generator/rdf-to-csv": {
      cs: "RDF to CSV",
      en: "RDF to CSV",
  },
  "http://example.com/generator/sparql": {
      cs: "SPARQL",
      en: "SPARQL",
  },
  "https://schemas.dataspecer.com/generator/shacl": {
      cs: "SHACL",
      en: "SHACL",
  },
  "https://schemas.dataspecer.com/generator/openapi": {
      cs: "OpenAPI",
      en: "OpenAPI",
  },
  "https://schemas.dataspecer.com/generator/shex": {
      cs: "ShEx",
      en: "ShEx",
  },
  // todo: do not identify artifacts by generator
  "https://schemas.dataspecer.com/generator/template-artifact": {
      cs: "Dokumentace",
      en: "Documentation",
  },
  "https://schemas.dataspecer.com/generator/shex-map": {
      cs: "ShEx Map",
      en: "ShEx Map",
  },
};

export const ArtifactNames: FC<{
  input: DeepPartial<DataSpecificationConfiguration>,
  defaultObject?: DataSpecificationConfiguration
  onChange: (options: DeepPartial<DataSpecificationConfiguration>) => void,

  currentConfiguration: object,
  //fullCurrentConfiguration: object,
}> = ({input, onChange, defaultObject, currentConfiguration}) => {
  const specification = useContext(SpecificationContext);
  const defaultConfiguration = useContext(DefaultConfigurationContext);
  const [searchParams] = useSearchParams();
  const dataSpecificationIri = searchParams.get("dataSpecificationIri");
  const backendConnector = useContext(BackendConnectorContext);

  const [currentArtifactConfiguration] = useAsyncMemo(async () => {
    const clonedSpecification = cloneDeep(specification);
    console.log("clonedSpecification", clonedSpecification);

    // @ts-ignore
    clonedSpecification.artefactConfiguration = currentConfiguration;

    const { store } = await getConfiguration(specification.id, "", backendConnector);

    // We know, that the current data specification and its stores are present
    const configurator = new ArtifactConfigurator(
      [clonedSpecification],
      store,
      defaultConfiguration,
      getDefaultConfigurators(),
    );

    const artifacts = await configurator.generateFor(dataSpecificationIri);

    const generators = [...new Set(artifacts.map(a => a.generator))];

    return generators;
  }, [specification, backendConnector]);

  return <FormGroup>
    <Typography sx={{mb: 3}}>
      This dialog allows you to change the names of the generated files within the data specification. Please note that only the last part of the path can be changed in this dialog.
      For example, you may rename <code>schema.json</code> to <code>json-schema.json</code>. It is possible to move files to subdirectories by prepending it to the path as <code>json/schema.json</code>.
    </Typography>

    {currentArtifactConfiguration?.map(artefact => <div key={artefact}>
      <FormControl variant="standard" fullWidth>
        <InputLabel>{artefactTitle[artefact]?.en ?? artefact}</InputLabel>
        <Input
          value={input.renameArtifacts?.[artefact] ?? ""}
          onChange={e => {
            if ((e.target.value === "" ? undefined : e.target.value) === defaultObject?.renameArtifacts?.[artefact]) {
              const renameArtifacts = {...input.renameArtifacts};
              delete renameArtifacts[artefact];
              onChange({...input, renameArtifacts});
            } else {
              onChange({...input, renameArtifacts: {...input.renameArtifacts, [artefact]: e.target.value}});
            }
          }}
        />
        <FormHelperText>Keep empty for default value</FormHelperText>
      </FormControl>
    </div>)}
  </FormGroup>
}
