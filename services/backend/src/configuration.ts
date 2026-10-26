// @ts-ignore
import configuration from "../main.config.js";

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

    // Root used for local models
    localRootIri: string;
    localRootMetadata: object;

    // Generator configuraion
    configuration: object;

    // Whether the server is running in Docker
    inDocker: boolean;
}

const defaultConfiguration = {
    payloadSizeLimit: "64mb",
    localRootIri: "http://dataspecer.com/packages/local-root",
    localRootMetadata: {
        label: {
            cs: "Specifikace",
            en: "Specifications"
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
