import { DataPsmSchema } from "@dataspecer/core/data-psm/model";
import { StoreContext } from "@dataspecer/federated-observable-store-react/store";
import { useResource } from "@dataspecer/federated-observable-store-react/use-resource";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AppBar, Box, Button, CircularProgress, Container, Divider, Toolbar, Typography, useTheme } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import React, { useCallback, useContext, useEffect, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Help } from "../../components/help";
import { ThemeSelector } from "../../components/theme-selector";
import { Configuration } from "../../generators/configuration/configuration";
import { useProvidedConfiguration } from "../../generators/configuration/providers/provided-configuration";
import { getAppBarGradient } from "../../utils/theme-helpers";
import { GenerateArtifactsMenu } from "./artifacts/generate-artifacts-menu";
import { MultipleArtifactsPreview } from "./artifacts/multiple-artifacts-preview";
import ButtonSetRoot from "./cim-search/button-set-root";
import { DataPsmSchemaItem } from "./data-psm/schema";
import { DialogAppProvider } from "./dialog-app-provider";
import { LanguageSelector } from "./language-selector";
import { SettingsContext, useApplicationSettings } from "./settings/settings";
import { SettingsMenu } from "./settings/settings-menu";

// @ts-ignore default value
export const ConfigurationContext = React.createContext<Configuration>(null);

const ButtonMenuTheme = createTheme({
  palette: {
    primary: {
      main: "#fff",
      contrastText: "rgba(0, 0, 0, 0.87)",
    },
  },
});

function useArtifactPreviewState() {
  const [get, set] = useSearchParams();

  const setArtifacts = useCallback(
    (artifacts: string[]) => {
      set((params) => {
        if (artifacts.length === 0) {
          params.delete("artifacts");
        } else {
          params.set("artifacts", artifacts.join(","));
        }
        return params;
      });
    },
    [set],
  );

  const current = useMemo(() => (get.get("artifacts") ?? "").split(",").filter((t) => t.length), [get]);

  return [current, setArtifacts] as const;
}

const AppContent: React.FC = () => {
  // List of generators that their artifacts will be shown as a live preview next to the modelled schema
  const [artifactPreview, setArtifactPreview] = useArtifactPreviewState();

  const configuration = useContext(ConfigurationContext);
  const { t } = useTranslation("ui");

  const { resource: root } = useResource<DataPsmSchema>(configuration.dataPsmSchemaIri);
  const rootHasPart = root && root.dataPsmParts.length > 0;

  return (
    <>
      <Container>
        <Box height="30px" />
        <Box display="flex" flexDirection="row" justifyContent="space-between">
          <Typography variant="h4" paragraph>
            {t("data structure edit title")}
          </Typography>
          <div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <GenerateArtifactsMenu artifactPreview={artifactPreview} setArtifactPreview={setArtifactPreview} />
              <ButtonSetRoot />
            </div>
          </div>
        </Box>
      </Container>
      <Box sx={{ display: "flex" }}>
        <Container>{configuration.dataPsmSchemaIri && rootHasPart && <DataPsmSchemaItem dataPsmSchemaIri={configuration.dataPsmSchemaIri} />}</Container>
        <MultipleArtifactsPreview artifactPreview={artifactPreview} setArtifactPreview={setArtifactPreview} />
      </Box>
      <Container>
        {!rootHasPart && (
          <Typography color={"textSecondary"} sx={{ py: 4 }}>
            <Trans i18nKey="no schema text" t={t}>
              _ <strong /> _
            </Trans>
          </Typography>
        )}
        <Divider style={{ margin: "1rem 0 1rem 0" }} />
        {import.meta.env.VITE_DEBUG_VERSION !== undefined && (
          <>
            {t("version")}: <span>{import.meta.env.VITE_DEBUG_VERSION}</span>
          </>
        )}
      </Container>
    </>
  );
};

export default function App() {
  const { t } = useTranslation("ui");
  const theme = useTheme();

  const applicationSettings = useApplicationSettings();

  const appBarBackground = getAppBarGradient(theme.palette.mode);

  const url = window.location.search;
  const { dataSpecificationIri, dataPsmSchemaIri } = useMemo(() => {
    const urlParams = new URLSearchParams(url);
    const dataSpecificationIri = urlParams.get("data-specification") ?? null;
    const dataPsmSchemaIri = urlParams.get("data-psm-schema") ?? null;
    return { dataSpecificationIri, dataPsmSchemaIri };
  }, [url]);

  const configuration = useProvidedConfiguration(dataSpecificationIri, dataPsmSchemaIri);
  useEffect(() => {
    (window as any).store = configuration?.store;
  }, [configuration?.store]);

  return (
    <>
      <SnackbarProvider maxSnack={5}>
        <SettingsContext.Provider value={applicationSettings}>
          <DialogAppProvider>
            <CssBaseline />
            <AppBar position="static" sx={{ background: appBarBackground }}>
              <Toolbar>
                <Typography variant="h6" sx={{ fontWeight: "normal" }}>
                  <strong>Dataspecer</strong> {t("title")}
                </Typography>
                <ThemeProvider theme={ButtonMenuTheme}>
                  <Button
                    color={"primary"}
                    variant="contained"
                    startIcon={<ArrowBackIcon />}
                    sx={{ mx: 3 }}
                    href={dataSpecificationIri ? import.meta.env.VITE_BASE_PATH + `/specification?dataSpecificationIri=${encodeURIComponent(dataSpecificationIri)}` : "/"}
                  >
                    {t("back to specification manager")}
                  </Button>
                </ThemeProvider>
                <Box display="flex" sx={{ flexGrow: 1, gap: 4 }} justifyContent="flex-end">
                  <Help />
                  <SettingsMenu />
                  <ThemeSelector />
                  <LanguageSelector />
                </Box>
              </Toolbar>
            </AppBar>
            {configuration && (
              <ConfigurationContext.Provider value={configuration}>
                <StoreContext.Provider value={configuration.store}>
                  <AppContent />
                </StoreContext.Provider>
              </ConfigurationContext.Provider>
            )}
            {!configuration && (
              <Container>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh" gap={2}>
                  <CircularProgress />
                  <Typography variant="h6" color="textSecondary">
                    {t("loading specification")}
                  </Typography>
                </Box>
              </Container>
            )}
          </DialogAppProvider>
        </SettingsContext.Provider>
      </SnackbarProvider>
    </>
  );
}
