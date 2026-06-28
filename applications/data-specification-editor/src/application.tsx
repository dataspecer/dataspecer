import { BackendPackageService } from "@dataspecer/core-v2/project";
import { getDefaultConfiguration, mergeConfigurations } from "@dataspecer/core/configuration/utils";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { SnackbarProvider } from "notistack";
import React, { createContext, StrictMode, useEffect, useMemo, useState } from "react";
import { BrowserRouter, useRoutes } from "react-router-dom";
import { getDefaultConfigurators } from "./configurators";
import EditorPage from "./editor/components/App";
import ManagerPage from "./manager/app";
import { Specification } from "./manager/routes/specification/specification";

/**
 * @deprecated You should use the model store instead.
 */
export const BackendConnectorContext = React.createContext(null as unknown as BackendPackageService);

/**
 * Contains merged default configuration from the source code and the configuration from the backend.
 */
export const DefaultConfigurationContext = createContext<object>(null as unknown as object);

const useDefaultConfiguration = () => {
  const [context, setContext] = useState<object>(() => getDefaultConfiguration(getDefaultConfigurators()));
  useEffect(() => {
    fetch(import.meta.env.VITE_BACKEND + "/default-configuration")
      .then((response) => response.json())
      .then((configuration) => setContext(mergeConfigurations(getDefaultConfigurators(), getDefaultConfiguration(getDefaultConfigurators()), configuration)));
  }, []);
  return context;
};

export const PACKAGE_ROOT = "http://dataspecer.com/packages/local-root";

export const Application = () => {
  const [backendConnector] = useState(new BackendPackageService(import.meta.env.VITE_BACKEND, httpFetch));

  const defaultConfiguration = useDefaultConfiguration();

  return (
    <StrictMode>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <MuiThemeWrapper>
          <SnackbarProvider maxSnack={3}>
            <BackendConnectorContext.Provider value={backendConnector}>
              <DefaultConfigurationContext.Provider value={defaultConfiguration}>
                <CssBaseline />
                <BrowserRouter basename={(import.meta.env.VITE_BASE_PATH ?? "") + "/"}>
                  <MainRouter />
                </BrowserRouter>
              </DefaultConfigurationContext.Provider>
            </BackendConnectorContext.Provider>
          </SnackbarProvider>
        </MuiThemeWrapper>
      </NextThemesProvider>
    </StrictMode>
  );
};

/**
 * Component that routes between manager and editor
 * @constructor
 */
const MainRouter = () => {
  return useRoutes([
    {
      path: "specification",
      element: (
        <ManagerPage>
          <Specification />
        </ManagerPage>
      ),
    },
    { path: "editor", element: <EditorPage /> },
  ]);
};

/**
 * Wrapper that provides MUI theme based on the next-themes theme mode
 */
const MuiThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { resolvedTheme } = useNextTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            light: "#7986cb",
            main: mode === "dark" ? "#90caf9" : "#3f51b5",
            dark: "#303f9f",
            contrastText: mode === "dark" ? "#000" : "#fff",
          },
          secondary: {
            light: "#ff4081",
            main: mode === "dark" ? "#f48fb1" : "#f50057",
            dark: "#c51162",
            contrastText: mode === "dark" ? "#000" : "#fff",
          },
          error: {
            light: "#e57373",
            main: "#f44336",
            dark: "#d32f2f",
            contrastText: "#fff",
          },
          warning: {
            light: "#ffb74d",
            main: "#ff9800",
            dark: "#f57c00",
            contrastText: "rgba(0, 0, 0, 0.87)",
          },
          info: {
            light: "#64b5f6",
            main: mode === "dark" ? "#64b5f6" : "#2196f3",
            dark: "#1976d2",
            contrastText: mode === "dark" ? "#000" : "#fff",
          },
          success: {
            light: "#81c784",
            main: "#4caf50",
            dark: "#388e3c",
            contrastText: "rgba(0, 0, 0, 0.87)",
          },
          background: {
            default: mode === "dark" ? "#121212" : "#fafafa",
            paper: mode === "dark" ? "#1e1e1e" : "#fff",
          },
          text: {
            primary: mode === "dark" ? "#ffffff" : "rgba(0, 0, 0, 0.87)",
            secondary: mode === "dark" ? "#b0b0b0" : "rgba(0, 0, 0, 0.6)",
            disabled: mode === "dark" ? "#6b6b6b" : "rgba(0, 0, 0, 0.38)",
          },
          action: {
            active: mode === "dark" ? "#ffffff" : "rgba(0, 0, 0, 0.54)",
            hover: mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
            selected: mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
            disabled: mode === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.26)",
            disabledBackground: mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
          },
          divider: mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
        },
      }),
    [mode],
  );

  useEffect(() => {
    document.body.style.backgroundColor = theme.palette.background.default;
  }, [theme]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};
