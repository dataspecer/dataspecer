import { DataSpecification } from "@dataspecer/backend-utils/connectors/specification";
import { DataSpecificationConfiguration, DataSpecificationConfigurator } from "@dataspecer/core/data-specification/configuration";
import AddIcon from "@mui/icons-material/Add";
import LoadingButton from "@mui/lab/LoadingButton";
import { Box, Button, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { saveAs } from "file-saver";
import React, { memo, useCallback, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { BackendConnectorContext, DefaultConfigurationContext } from "../../../application";
import { LanguageStringText } from "../../../editor/components/helper/LanguageStringComponents";
import { provideConfiguration } from "../../../editor/configuration/provided-configuration";
import { useDialog } from "../../../editor/dialog";
import { ConfigureArtifacts } from "../../artifacts/configuration/configure-artifacts";
import { ConfigureButton } from "../../artifacts/configuration/configure-button";
import { DefaultArtifactBuilder } from "../../artifacts/default-artifact-builder";
import { GenerateReport } from "../../artifacts/generate-report";
import { DeleteDataSchemaForm } from "../../components/delete-data-schema-form";
import { SpecificationTags } from "../../components/specification-tags";
import { getEditorLink } from "../../shared/get-schema-generator-link";
import { ConceptualModelTargets } from "./conceptual-model-targets";
import { CopyIri } from "./copy-iri";
import { DataStructureBox } from "./data-structure-row";
import { GeneratingDialog } from "./generating-dialog";
import { ModifySpecification } from "./modify-specification";
import { RedirectDialog } from "./redirect-dialog";
import { ReuseDataSpecifications } from "./reuse-data-specifications";
import { AllSpecificationsContext, SpecificationContext } from "./specification";

export const DocumentationSpecification = memo(() => {
  const { t } = useTranslation("ui");

  const [specification] = useContext(SpecificationContext);
  const dataSpecificationIri = specification.id;

  const defaultConfiguration = useContext(DefaultConfigurationContext);

  const backendConnector = useContext(BackendConnectorContext);

  const navigate = useNavigate();

  const [redirecting, setRedirecting] = useState(false);
  const createDataStructure = useCallback(async () => {
    if (dataSpecificationIri) {
      setRedirecting(true);
      const { createdPsmSchemaIri } = await backendConnector.createDataStructure(dataSpecificationIri);
      navigate(getEditorLink(dataSpecificationIri, createdPsmSchemaIri));
      setRedirecting(false);
    }
  }, [navigate, backendConnector, dataSpecificationIri]);

  const [zipLoading, setZipLoading] = React.useState<false | "stores-loading" | "generating">(false);
  const [generateDialogOpen, setGenerateDialogOpen] = React.useState<boolean>(false);
  const [generateState, setGenerateState] = React.useState<GenerateReport>([]);
  const generateZip = async (configurationId: string, overrideBasePathsToNull: boolean = false) => {
    setZipLoading("stores-loading");
    setGenerateState([]);
    setGenerateDialogOpen(true);

    // Gather all data specifications

    // We know, that the current data specification must be present
    let gatheredDataSpecifications: Record<string, DataSpecification> = {};

    const toProcessDataSpecification = [dataSpecificationIri as string];
    for (let i = 0; i < toProcessDataSpecification.length; i++) {
      const dataSpecification = await backendConnector.getDataSpecification(toProcessDataSpecification[i]);
      gatheredDataSpecifications[dataSpecification.id as string] = dataSpecification;
      dataSpecification.importsDataSpecificationIds.forEach((importedDataSpecificationId) => {
        if (!toProcessDataSpecification.includes(importedDataSpecificationId)) {
          toProcessDataSpecification.push(importedDataSpecificationId);
        }
      });
      // @ts-ignore
      dataSpecification.artefactConfiguration = await backendConnector.getArtifactConfiguration(dataSpecification.artifactConfigurations[0].id);
    }

    // Override base urls to null
    if (overrideBasePathsToNull) {
      gatheredDataSpecifications = structuredClone(gatheredDataSpecifications);
      for (const ds of Object.values(gatheredDataSpecifications)) {
        // @ts-ignore
        if (ds.artefactConfiguration[DataSpecificationConfigurator.KEY]) {
          // @ts-ignore
          (ds.artefactConfiguration[DataSpecificationConfigurator.KEY] as DataSpecificationConfiguration).publicBaseUrl = null;
        }
      }
    }

    const { store: federatedStore, dataSpecifications: ds2 } = await provideConfiguration(dataSpecificationIri as string, "");

    setZipLoading("generating");

    // @ts-ignore
    const generator = new DefaultArtifactBuilder(federatedStore, ds2, defaultConfiguration);
    await generator.prepare(Object.keys(ds2), setGenerateState);
    const data = await generator.build();
    saveAs(data, "artifact.zip");
    setZipLoading(false);
  };

  const DeleteForm = useDialog(DeleteDataSchemaForm);

  const allSpecifications = useContext(AllSpecificationsContext);

  return (
    <>
      <Box height="30px" />
      <Box display="flex" flexDirection="row" justifyContent="space-between">
        <Typography variant="h3" component="div" gutterBottom>
          <LanguageStringText from={specification.userMetadata.label} fallback={dataSpecificationIri} />
        </Typography>
        <div style={{ display: "flex", gap: "1rem" }}>
          <ConfigureButton />
          <CopyIri iri={dataSpecificationIri} />
          <ModifySpecification />
        </div>
      </Box>
      <SpecificationTags specification={specification} />

      <Box display="flex" flexDirection="row" justifyContent="space-between" sx={{ mt: 10 }}>
        <Grid container spacing={3}>
          {specification?.dataStructures.map((psm) => (
            <Grid item xs={4} key={psm.id}>
              <DataStructureBox dataStructureIri={psm.id} specification={specification} onDelete={() => DeleteForm.open({ dataStructureIri: psm.id })} />
            </Grid>
          ))}

          <Grid item xs={4}>
            <Button
              variant="outlined"
              color={"inherit"}
              sx={{ height: "4.75cm", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={createDataStructure}
              fullWidth
            >
              <AddIcon fontSize={"large"} color={"inherit"} />
              <Typography>{t("create data structure")}</Typography>
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Box display="flex" flexDirection="row" justifyContent="space-between" sx={{ mt: 5 }}>
        <Typography variant="h5" component="div" gutterBottom>
          {t("reused data specifications")}
        </Typography>
        <ReuseDataSpecifications />
      </Box>
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "100%" }}>{t("name")}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {specification?.importsDataSpecificationIds.map((importedSpecificationId) => (
              <TableRow key={importedSpecificationId}>
                <TableCell component="th" scope="row" sx={{ width: "25%", fontWeight: "bold" }}>
                  <LanguageStringText from={allSpecifications[importedSpecificationId]?.userMetadata.label} fallback={importedSpecificationId} />
                </TableCell>
                <TableCell align="right">
                  <Box
                    sx={{
                      display: "flex",
                      gap: "1rem",
                    }}
                  >
                    <Button variant="outlined" color={"primary"} component={Link} to={`/specification?dataSpecificationIri=${encodeURIComponent(importedSpecificationId)}`}>
                      {t("detail")}
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h5" component="div" gutterBottom sx={{ mt: 5 }}>
        {t("generate artifacts")}
      </Typography>
      <GeneratingDialog isOpen={generateDialogOpen} close={() => setGenerateDialogOpen(false)} inProgress={!!zipLoading} generateReport={generateState} />
      {specification &&
        specification.artifactConfigurations.map((configuration) => (
          <Box
            key={configuration.id}
            sx={{
              height: "5rem",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            {dataSpecificationIri && <ConfigureArtifacts dataSpecificationId={dataSpecificationIri} configurationId={configuration.id} />}
            <LoadingButton variant="contained" onClick={() => generateZip(configuration.id, false)} loading={zipLoading !== false}>
              {t("generate zip file")}
            </LoadingButton>
            <LoadingButton onClick={() => generateZip(configuration.id, true)} loading={zipLoading !== false}>
              {t("generate zip file with relative paths")}
            </LoadingButton>
            <Button variant="contained" href={import.meta.env.VITE_BACKEND + "/generate?iri=" + encodeURIComponent(dataSpecificationIri)}>
              Generate sample application
            </Button>
          </Box>
        ))}

      <ConceptualModelTargets />

      {/* <Typography variant="h5" component="div" gutterBottom sx={{mt: 5}}>
            Advanced
        </Typography>

        <GarbageCollection dataSpecificationIri={dataSpecificationIri} />
        <ConsistencyFix dataSpecificationIri={dataSpecificationIri} />
        <UpdatePim dataSpecificationIri={dataSpecificationIri} /> */}

      <RedirectDialog isOpen={redirecting} />
      <DeleteForm.Component />
    </>
  );
});
