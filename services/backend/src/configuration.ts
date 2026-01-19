// @ts-ignore
import configuration from "../main.config.js";          // Has to be first in imports otherwise it shows error
import { type GitBotConfiguration, type OAuthConfiguration } from "@dataspecer/auth";
import { GitProviderNamesAsType } from "@dataspecer/git";


export interface Configuration {
    /**
     * Public URL of server only.
     * @deprecated, use baseName. If baseName is set, then host is baseName + "/api"
     */
    host?: string;

    /**
     * Base name of the whole application, i.e. URL to the main page of Dataspecer.
     * Deprecates host.
     * Must not end with a slash.
     */
    baseName?: string;

    /**
     * Static files path.
     * Works only with baseName.
     */
    staticFilesPath?: string;

    // Local port to listen on
    port: number;

    // Max payload limit for stores PUSH operation
    payloadSizeLimit: string;

    // Root used for v1 dataspecer
    v1RootIri: string;
    v1RootMetadata: object;

    // Root used for local models
    localRootIri: string;
    localRootMetadata: object;

    // Generator configuraion
    configuration: object;

    gitBotConfigurations?: Record<GitProviderNamesAsType, GitBotConfiguration>;
    authConfiguration?: OAuthConfiguration;
    /**
     * Must not end with slash
     * TODO RadStr: For local development. It will probably not be needed once we are in production. In production we will just use the basename/api
     */
    gitWebhookBaseUrl?: string;

    // Whether the server is running in Docker
    inDocker: boolean;
}

const defaultConfiguration = {
    payloadSizeLimit: "64mb",
    v1RootIri: "http://dataspecer.com/packages/local-root",
    v1RootMetadata: {
        label: {
            cs: "Datové specifikace z core@v.1",
            en: "Data specifications from core@v.1"
        },
        description: {
            cs: "Tato složka obsahuje všechny datové specifikace se kterými dokáže pracovat manažer specifikací z core@v.1.",
            en: "This folder contains all data specifications that can be managed by the data specification manager from core@v.1."
        }
    },

    localRootIri: "http://dataspecer.com/packages/local-root",
    localRootMetadata: {
        label: {
            cs: "Lokální modely",
            en: "Local models"
        },
    },
} as Partial<Configuration>

const envConfiguration = {} as Partial<Configuration>;
if (process.env.HOST) {
    envConfiguration.host = process.env.HOST;
}
if (process.env.BASE_NAME) {
    envConfiguration.baseName = process.env.BASE_NAME;
}
if (process.env.STATIC_FILES_PATH) {
    envConfiguration.staticFilesPath = process.env.STATIC_FILES_PATH;
}
if (process.env.PORT) {
    envConfiguration.port = Number(process.env.PORT);
}
envConfiguration.inDocker = process.env.DOCKER === "1";

export default ({...defaultConfiguration, ...configuration, ...envConfiguration} as Configuration);
