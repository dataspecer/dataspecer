import { DataSpecificationConfiguration, DataSpecificationConfigurator } from "@dataspecer/core/data-specification/configuration";
import { DefaultArtifactBuilder, GenerateReport } from "@dataspecer/specification/v1";
import AddIcon from "@mui/icons-material/Add";
import LoadingButton from "@mui/lab/LoadingButton";
import { Box, Button, Fab, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { saveAs } from "file-saver";
import { Magnet } from "lucide-react";
import React, { memo, useCallback, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { DefaultConfigurationContext } from "../../../application";
import { LanguageStringText } from "../../../editor/components/helper/LanguageStringComponents";
import { useDialog } from "../../../editor/dialog";
import { getConfiguration } from "../../../configuration/provided-configuration";
import { ZipStreamDictionary } from "../../../generators/zip-stream-dictionary";
import { ConfigureArtifacts } from "../../artifacts/configuration/configure-artifacts";
import { ConfigureButton } from "../../artifacts/configuration/configure-button";
import { DeleteDataSchemaForm } from "../../components/delete-data-schema-form";
import { SpecificationTags } from "../../components/specification-tags";
import { getEditorLink } from "../../shared/get-schema-generator-link";
import { ConceptualModelTargets } from "./conceptual-model-targets";
import { CopyIri } from "./copy-iri";
import { DataStructureBox } from "./data-structure-row";
import { GeneratingDialog } from "./generating-dialog";
import { ProfileStructureDialog } from "./profile-structure";
import { RedirectDialog } from "./redirect-dialog";
import { ReuseDataSpecifications } from "./reuse-data-specifications";
import { PROJECT_MODEL_ID, SpecificationContext, useModelStore } from "./specification";
import { createCreateModelOperation, type ProjectModelEntity } from "@dataspecer/project-model";
import { V1 } from "@dataspecer/core-v2/model/known-models";
import { useModelStoreEntity } from "@dataspecer/model-store/react";

const ImportedSpecificationLabel: React.FC<{ modelId: string; fallback: string }> = ({ modelId, fallback }) => {
  const entity = useModelStoreEntity<ProjectModelEntity>(PROJECT_MODEL_ID, modelId);
  return <LanguageStringText from={entity?.label} fallback={fallback} />;
};

export const DocumentationSpecification = memo(() => {
  const { t } = useTranslation("ui");

  const specification = useContext(SpecificationContext);
  const dataSpecificationIri = specification.id;

  const defaultConfiguration = useContext(DefaultConfigurationContext);

  const modelStore = useModelStore();

  const navigate = useNavigate();

  const [redirecting, setRedirecting] = useState(false);
  const createDataStructure = useCallback(async () => {
    if (dataSpecificationIri) {
      setRedirecting(true);
      const op = createCreateModelOperation(dataSpecificationIri, V1.PSM);
      const transaction = modelStore.transaction([{
        operation: op,
        modelId: PROJECT_MODEL_ID,
      }], {});
      await transaction.confirmation;

      navigate(getEditorLink(dataSpecificationIri, op.modelId));
      setRedirecting(false);
    }
  }, [navigate, modelStore, dataSpecificationIri]);

  const profileStructureDialog = useDialog(ProfileStructureDialog, ["dataSpecificationId"]);

  const [zipLoading, setZipLoading] = React.useState<false | "stores-loading" | "generating">(false);
  const [generateDialogOpen, setGenerateDialogOpen] = React.useState<boolean>(false);
  const [generateState, setGenerateState] = React.useState<GenerateReport>([]);
  const generateZip = async (configurationId: string, overrideBasePathsToNull: boolean = false) => {
    setZipLoading("stores-loading");
    setGenerateState([]);
    setGenerateDialogOpen(true);

    const { store: federatedStore, dataSpecifications, models } = await getConfiguration(dataSpecificationIri as string, "");

    // Override base urls to null
    if (overrideBasePathsToNull) {
      for (const ds of Object.values(dataSpecifications)) {
        // @ts-expect-error different type of configuration
        if (ds.artefactConfiguration[DataSpecificationConfigurator.KEY]) {
          // @ts-expect-error different type of configuration
          (ds.artefactConfiguration[DataSpecificationConfigurator.KEY] as DataSpecificationConfiguration).publicBaseUrl = null;
        }
      }
    }

    setZipLoading("generating");

    const generator = new DefaultArtifactBuilder(federatedStore, dataSpecifications, defaultConfiguration, fetch, models);
    await generator.prepare(Object.keys(dataSpecifications), setGenerateState);
    const zip = new ZipStreamDictionary();
    await generator.build(zip);
    const data = await zip.save();
    saveAs(data, "artifact.zip");
    setZipLoading(false);
  };

  const DeleteForm = useDialog(DeleteDataSchemaForm);

  return (
    <>
      <Box height="30px" />
      <Box display="flex" flexDirection="row" justifyContent="space-between">
        <Typography variant="h3" component="div" gutterBottom>
          <LanguageStringText from={specification.label} fallback={dataSpecificationIri} />
        </Typography>
        <div style={{ display: "flex", gap: "1rem" }}>
          <ConfigureButton />
          <CopyIri iri={dataSpecificationIri} />
        </div>
      </Box>
      <SpecificationTags specification={specification} />

      <Box display="flex" flexDirection="row" sx={{ mt: 5 }}>
        <div className="grow" />
        <Fab variant="extended" size="medium" color={"primary"} onClick={profileStructureDialog.open}>
          <Magnet className="mr-1" />
          {t("profile")}
        </Fab>
      </Box>
      <Box display="flex" flexDirection="row" justifyContent="space-between" sx={{ mt: 2 }}>
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
                  <ImportedSpecificationLabel modelId={importedSpecificationId} fallback={importedSpecificationId} />
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
          </Box>
        ))}

      <ConceptualModelTargets />

      <RedirectDialog isOpen={redirecting} />
      <DeleteForm.Component />
      <profileStructureDialog.Component dataSpecificationId={dataSpecificationIri} />
    </>
  );
});
