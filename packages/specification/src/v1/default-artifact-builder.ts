import { Configurator } from "@dataspecer/core/configuration/configurator";
import { CoreResourceReader } from "@dataspecer/core/core";
import { DataSpecification as CoreDataSpecification } from "@dataspecer/core/data-specification/model";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { Generator } from "@dataspecer/generators/generator";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { GenerateReport } from "./generate-report.ts";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { ArtifactConfigurator } from "./artifact-configurator.ts";
import { getArtefactGenerators, getDefaultConfigurators } from "./artefact-generators.ts";
import { generateSpecification, type GenerateSpecificationContext } from "../specification.ts";
import { DataSpecification } from "../specification/model.ts";
import { getPartialDocumentationConfiguration } from "@dataspecer/documentation";
import type { SpecificationUrls, SpecificationUrlOverride } from "../specification-urls.ts";

export interface ArtifactBuilderUrlOptions {
    specificationId: string;
    /** Includes query parameters; null uses the specification's configured base or `/`. */
    baseUrl: string | null;
    specificationOverrides?: Record<string, SpecificationUrlOverride>;
}

/**
 * Class handling a construction of the zip file. Configuration, helper files, etc.
 */
export class DefaultArtifactBuilder {
    private readonly store: CoreResourceReader;
    private readonly dataSpecifications: Record<string, DataSpecification & {artefacts: any}>;
    private dataSpecificationIris: string[] = [];
    private reportCallback: ((report: GenerateReport) => void) | undefined;
    private artifactReport: GenerateReport = [];
    private configuration: object;
    private readonly httpFetch: HttpFetch;
    private readonly configurator: Configurator[];
    private readonly models: Record<string, EntityRecord>;
    private specificationUrls: Record<string, SpecificationUrls> = {};
    private specificationUrlOverrides: Record<string, SpecificationUrlOverride> = {};

    /**
     * Whether to generate a single specification only. This will affect the file structure.
     */
    singleSpecificationOnly = false;

    /**
     * Transaction history of the project, used to publish the operations
     * (chunked by the versions marked in the history) as an LDES stream. See
     * {@link GenerateSpecificationContext.history}.
     */
    history: GenerateSpecificationContext["history"];

    public constructor(
        store: CoreResourceReader,
        dataSpecifications: Record<string, DataSpecification>,
        configuration: object,
        httpFetch: HttpFetch,
        models: Record<string, EntityRecord>,
        configurator?: Configurator[],
    ) {
        this.store = store;
        // @ts-ignore
        this.dataSpecifications = dataSpecifications;
        this.configuration = configuration;
        this.httpFetch = httpFetch;
        this.configurator = configurator ?? getDefaultConfigurators();
        this.models = models;
    }

    public async prepare(
      dataSpecificationIris: string[],
      reportCallback: ((report: GenerateReport) => void) | undefined = undefined,
      urls?: ArtifactBuilderUrlOptions,
    ) {
        this.dataSpecificationIris = dataSpecificationIris;
        this.reportCallback = reportCallback;

        // Generate artifacts
        const artifactConfigurator = new ArtifactConfigurator(
            Object.values(this.dataSpecifications),
            this.store as FederatedObservableStore,
            this.configuration,
            this.configurator,
        );

        this.specificationUrlOverrides = { ...urls?.specificationOverrides };
        if (urls) {
            this.specificationUrlOverrides[urls.specificationId] = {
                preferRelativeLinking: this.specificationUrlOverrides[urls.specificationId]?.preferRelativeLinking,
                baseUrl: urls.baseUrl ?? undefined,
            };
        }
        artifactConfigurator.urlOverrides = this.specificationUrlOverrides;
        for (const [id, entity] of Object.entries(this.models._project_model ?? {})) {
            if ("documentBaseUrl" in entity && typeof entity.documentBaseUrl === "string") {
                artifactConfigurator.documentationUrls[id] = entity.documentBaseUrl;
            }
        }

        for (const dataSpecificationIri of dataSpecificationIris) {
            this.dataSpecifications[dataSpecificationIri]!.artefacts =
              await artifactConfigurator.generateFor(dataSpecificationIri, this.singleSpecificationOnly);
        }
        this.specificationUrls = artifactConfigurator.specificationUrls;

        this.artifactReport = dataSpecificationIris
          .flatMap(dataSpecificationIri => this.dataSpecifications[dataSpecificationIri]!.artefacts.filter((a: any) => a.outputPath).map((artifact: any) => ({
              artifact: artifact,
              state: "pending",
              error: null,
          })));
        reportCallback?.(this.artifactReport);
    }

    /**
     * Builds the given data specifications and adds additional files to the
     * final zip. The build process is split into individual artifacts in a way
     * that if one fails, other can still be generated.
     */
    public async build(dictionary: StreamDictionary, singleFileArtifact: string | null = null, singleSpecificationId: string | null = null): Promise<void> {
        await this.writeArtifacts(dictionary, singleFileArtifact, singleSpecificationId ?? undefined);
    }

    private async writeArtifacts(
      zip: StreamDictionary,
      singleFileArtifact: string | null = null,
      singleSpecificationId?: string,
    ) {
        // Convert data specification
        const dataSpecifications = Object.values(this.dataSpecifications).map(specification => ({
            ...specification,
            iri: specification.id,
            pim: specification.id,
            psms: specification.dataStructures.map(ds => ds.id),
            type: CoreDataSpecification.TYPE_DOCUMENTATION,
            importsDataSpecifications: specification.importsDataSpecificationIds,
            artefacts: specification.artefacts,
            preferRelativeLinking: this.specificationUrls[specification.id]?.preferRelativeLinking,
            // @ts-ignore
            artefactConfiguration: specification.artefactConfiguration,
            cimAdapters: [],
        })) as CoreDataSpecification[];

        const generator = new Generator(
            dataSpecifications,
            this.store,
            getArtefactGenerators()
        );

        for (const dataSpecificationIri of this.dataSpecificationIris) {
            if (singleSpecificationId && dataSpecificationIri !== singleSpecificationId) {
                continue; // Skip specifications that are not the one we want to generate
            }
            for (const artifact of this.dataSpecifications[dataSpecificationIri]!.artefacts) {
                if (singleFileArtifact && !artifact.outputPath.startsWith(singleFileArtifact)) {
                    continue; // Skip artifacts that are not generated
                }
                try {
                    this.updateState(artifact.iri as string, "progress", null);
                    await generator.generateArtefact(dataSpecificationIri, artifact.iri as string, zip);
                    this.updateState(artifact.iri as string, "success", null);
                } catch (error) {
                    console.warn(`Failed to generate artifact ${artifact.iri} (with output path ${artifact.outputPath}) for specification ${dataSpecificationIri}. The error message follows.`);
                    console.error(error);
                    this.updateState(artifact.iri as string, "error", error as Error);

                    const stream = zip.writePath(artifact.outputPath + ".error.txt");
                    await stream.write((error as Error)?.message + "\n\n" + (error as Error)?.stack);
                    await stream.close();
                }
            }

            let newGeneratorsPath = this.dataSpecifications[dataSpecificationIri]?.artefacts.find((a: any) => a.generator === "https://schemas.dataspecer.com/generator/template-artifact").outputPath;
            newGeneratorsPath = newGeneratorsPath?.split("/").slice(0, -2).join("/"); // remove lang and index.html
            newGeneratorsPath = newGeneratorsPath ? newGeneratorsPath + "/" : ""; // default to "en" if not specified
            // use new generator for the rest
            await generateSpecification(
                dataSpecificationIri,
                {
                    models: this.models,
                    output: zip,
                    history: this.history,
                    defaultDocumentationConfiguration: getPartialDocumentationConfiguration(this.configuration),
                    specificationUrls: this.specificationUrls,
                    specificationUrlOverrides: this.specificationUrlOverrides,

                    fetch: this.httpFetch,

                    v1Context: await generator.createContext(),
                    v1Specification: dataSpecifications.find(specification => specification.iri === dataSpecificationIri),

                    // @ts-ignore
                    artifacts: this.dataSpecifications[dataSpecificationIri].artefacts,
                },
                {
                    subdirectory: newGeneratorsPath,
                }
            );
        }
    }

    private updateState(artifactIri: string, state: GenerateReport[0]["state"], error: GenerateReport[0]["error"]) {
        this.artifactReport = this.artifactReport.map(artifact => {
            if (artifact.artifact.iri === artifactIri) {
                return {
                    ...artifact,
                    state,
                    error,
                };
            }
            return artifact;
        });
        this.reportCallback?.(this.artifactReport);
    }
}
