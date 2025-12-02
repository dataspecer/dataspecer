// @ts-ignore
import configuration from "../main.config.js";
import { GitProviderNamesAsType } from "@dataspecer/git";

type GitConfiguration = {
    /**
     * The user name for the bot, which will be used for commiting if user does not provide credentials or does not have credentials with sufficient rights
     */
    dsBotUserName: string;
    /**
     * The email address of the bot.
     */
    dsBotEmail: string;
    /**
     * Git provider token which can be used for cloning/committing (possibly even removing)
     */
    dsBotAbsoluteGitProviderControlToken: string;
    /**
     * Id to store the ssh config of bot under.
     */
    dsBotSSHId?: string;
    /**
     * Is the private ssh key of the bot to use.
     */
    dsBotSSHPrivateKey?: string;
}

type AuthConfiguration = {
    /**
     * Is any random string, it will be used as a secret for authJS
     */
    authSecret: string,
    /**
     * is the Id of the OAuth app, you can find it after creating OAuth app in GitHub settings
     */
    gitHubAuthClientId: string,
    /**
     * Same as id
     */
    gitHubAuthClientSecret: string,
}


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

    gitConfigurations?: Record<GitProviderNamesAsType, GitConfiguration>;
    authConfiguration?: AuthConfiguration;
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

export default ({...defaultConfiguration, ...configuration, ...envConfiguration} as Configuration);
