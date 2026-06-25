import { Configurator } from "@dataspecer/core/configuration/configurator";
import { CoreResourceReader } from "@dataspecer/core/core";
import { DataSpecification as CoreDataSpecification } from "@dataspecer/core/data-specification/model";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { Generator } from "@dataspecer/core/generator";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { GenerateReport } from "./generate-report.ts";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { ArtifactConfigurator } from "./artifact-configurator.ts";
import { getArtefactGenerators, getDefaultConfigurators } from "./artefact-generators.ts";
import { generateSpecification } from "../specification.ts";
import { DataSpecification } from "../specification/model.ts";

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

    /**
     * Whether to generate a single specification only. This will affect the file structure.
     */
    singleSpecificationOnly = false;

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
      queryParams: string = "",
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

        artifactConfigurator.queryParams = queryParams;

        for (const dataSpecificationIri of dataSpecificationIris) {
            this.dataSpecifications[dataSpecificationIri]!.artefacts =
              await artifactConfigurator.generateFor(dataSpecificationIri, this.singleSpecificationOnly);
        }

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
    public async build(dictionary: StreamDictionary, singleFileArtifact: string | null = null, queryParams: string = "", singleSpecificationId: string | null = null): Promise<void> {
        await this.writeArtifacts(dictionary, singleFileArtifact, queryParams, singleSpecificationId ?? undefined);
    }

    private async writeArtifacts(
      zip: StreamDictionary,
      singleFileArtifact: string | null = null,
      queryParams: string = "",
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

                    fetch: this.httpFetch,

                    v1Context: await generator.createContext(),
                    v1Specification: dataSpecifications.find(specification => specification.iri === dataSpecificationIri),

                    // @ts-ignore
                    artifacts: this.dataSpecifications[dataSpecificationIri].artefacts,
                },
                {
                    subdirectory: newGeneratorsPath,
                    queryParams
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
