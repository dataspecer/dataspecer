import React, {useContext, useEffect, useMemo, useState} from "react";
import {AppBar, Box, Button, Container, Divider, Toolbar, Typography, useTheme} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import ButtonSetRoot from "./cim-search/button-set-root";
import {DataPsmSchemaItem} from "./data-psm/schema";
import {GenerateArtifactsMenu} from "./artifacts/generate-artifacts-menu";
import {SnackbarProvider} from "notistack";
import {LanguageSelector} from "./language-selector";
import {Trans, useTranslation} from "react-i18next";
import {DialogAppProvider} from "./dialog-app-provider";
import {MultipleArtifactsPreview} from "./artifacts/multiple-artifacts-preview";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {createTheme, ThemeProvider} from "@mui/material/styles";
import {useProvidedConfiguration} from "../../generators/configuration/providers/provided-configuration";
import {Configuration} from "../../generators/configuration/configuration";
import {StoreContext} from "@dataspecer/federated-observable-store-react/store"
import {useResource} from "@dataspecer/federated-observable-store-react/use-resource";
import {DataPsmSchema} from "@dataspecer/core/data-psm/model";
import {SettingsMenu} from "./settings/settings-menu";
import {SettingsContext, useApplicationSettings} from "./settings/settings";
import {Help} from "../../components/help";
import {ThemeSelector} from "../../components/theme-selector";

// @ts-ignore default value
export const ConfigurationContext = React.createContext<Configuration>(null);

const ButtonMenuTheme = createTheme({
    palette: {
        primary: {
            "main": "#fff",
            "contrastText": "rgba(0, 0, 0, 0.87)"
        },
    },
});

const AppContent: React.FC = () => {
    // List of generators that their artifacts will be shown as a live preview next to the modelled schema
    const [artifactPreview, setArtifactPreview] = useState<string[]>([]);

    const configuration = useContext(ConfigurationContext);
    const {t} = useTranslation('ui');

    const {resource: root} = useResource<DataPsmSchema>(configuration.dataPsmSchemaIri);
    const rootHasPart = root && root.dataPsmParts.length > 0;

    return <>
        <Container>
            <Box height="30px"/>
            <Box display="flex" flexDirection="row" justifyContent="space-between">
                <Typography variant="h4" paragraph>{t("data structure edit title")}</Typography>
                <div>
                    <div style={{display: "flex", gap: "1rem"}}>
                        <GenerateArtifactsMenu artifactPreview={artifactPreview} setArtifactPreview={setArtifactPreview} />
                        <ButtonSetRoot />
                    </div>
                </div>
            </Box>
        </Container>
        <Box sx={{display: "flex"}}>
            <Container>
                {configuration.dataPsmSchemaIri && rootHasPart && <DataPsmSchemaItem dataPsmSchemaIri={configuration.dataPsmSchemaIri}/>}
            </Container>
            <MultipleArtifactsPreview artifactPreview={artifactPreview} setArtifactPreview={setArtifactPreview} />
        </Box>
        <Container>
            {!rootHasPart &&
                <Typography color={"textSecondary"} sx={{py: 4}}>
                    <Trans i18nKey="no schema text" t={t}>
                        _ <strong /> _
                    </Trans>
                </Typography>
            }
            <Divider style={{margin: "1rem 0 1rem 0"}} />
            {import.meta.env.VITE_DEBUG_VERSION !== undefined &&
                <>
                    {t("version")}: <span>{import.meta.env.VITE_DEBUG_VERSION}</span>
                </>
            }
        </Container>
    </>
}

/**
 * Main component that renders the whole editor UI. The editor is only one-page application, therefore no router is
 * required.
 */
const App: React.FC = () => {

    /**
     * Decode URL that configures which structure shall be edited
     */

    const url = window.location.search;
    const {dataSpecificationIri, dataPsmSchemaIri} = useMemo(() => {
        const urlParams = new URLSearchParams(url);
        const dataSpecificationIri = urlParams.get("data-specification") ?? null;
        const dataPsmSchemaIri = urlParams.get("data-psm-schema") ?? null;
        return {dataSpecificationIri, dataPsmSchemaIri};
    }, [url]);

    const configuration = useProvidedConfiguration(dataSpecificationIri, dataPsmSchemaIri);

    if (configuration) {
        return <AppWithConfiguration configuration={configuration} dataSpecificationIri={dataSpecificationIri} />;
    } else {
        return null;
    }
};

function AppWithConfiguration({configuration, dataSpecificationIri}: {configuration: Configuration, dataSpecificationIri: string | null}) {
    const { t } = useTranslation('ui');
    const theme = useTheme();

    useEffect(() => {(window as any).store = configuration.store}, [configuration.store]);

    const applicationSettings = useApplicationSettings();

    const appBarBackground = theme.palette.mode === "dark"
      ? "linear-gradient(5deg, #2c1a45, #2a3f8f)"
      : "linear-gradient(5deg, #5d2f86, #3f51b5)";

    return <>
        <SnackbarProvider maxSnack={5}>
            <SettingsContext.Provider value={applicationSettings}>
                <DialogAppProvider>
                    <CssBaseline />
                    <AppBar position="static" sx={{background: appBarBackground}}>
                        <Toolbar>
                            <Typography variant="h6" sx={{fontWeight: "normal"}}>
                                <strong>Dataspecer</strong> {t("title")}
                            </Typography>
                            <ThemeProvider theme={ButtonMenuTheme}>
                                <Button
                                  color={"primary"}
                                  variant="contained"
                                  startIcon={<ArrowBackIcon />}
                                  sx={{mx: 3}}
                                  href={dataSpecificationIri ? import.meta.env.VITE_BASE_PATH + `/specification?dataSpecificationIri=${encodeURIComponent(dataSpecificationIri)}` : "/"}
                                >
                                    {t("back to specification manager")}
                                </Button>
                            </ThemeProvider>
                            <Box display="flex" sx={{flexGrow: 1, gap: 4}} justifyContent="flex-end">
                                <Help />
                                <SettingsMenu />
                                <ThemeSelector />
                                <LanguageSelector />
                            </Box>
                        </Toolbar>
                    </AppBar>
                    <ConfigurationContext.Provider value={configuration}>
                        <StoreContext.Provider value={configuration.store}>
                            <AppContent />
                        </StoreContext.Provider>
                    </ConfigurationContext.Provider>
                </DialogAppProvider>
            </SettingsContext.Provider>
        </SnackbarProvider>
    </>;
}

export default App;
