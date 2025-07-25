import { Configurator } from "@dataspecer/core/configuration/configurator";
import { getDefaultConfiguration, mergeConfigurations } from "@dataspecer/core/configuration/utils";
import { CoreResourceReader, LanguageString } from "@dataspecer/core/core";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model";
import { DataSpecificationConfigurator } from "@dataspecer/core/data-specification/configuration";
import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { getSchemaArtifacts } from "./schema-artifacts.ts";
import { DataSpecification } from "../specification/model.ts";
import { getDefaultConfigurators } from "./artefact-generators.ts";

/**
 * This class is responsible for setting the artifacts definitions in
 * {@link DataSpecification}. This class should be highly configurable, allowing
 * to set various parameters for how the resulting generated object should look
 * like.
 */
export class DefaultArtifactConfigurator {
  protected readonly dataSpecifications: DataSpecification[];
  protected readonly store: CoreResourceReader;
  protected configurationObject: object;
  protected configurators: Configurator[];

  /**
   * Root URL for the generated artifacts.
   * @example
   * "/"
   * @example
   * "http://example.com/files/"
   */
  baseURL = "/";

  queryParams: string = "";

  constructor(
    dataSpecifications: DataSpecification[],
    store: FederatedObservableStore,
    configurationObject: object,
    configurators?: Configurator[],
  ) {
    this.dataSpecifications = dataSpecifications;
    this.store = store as CoreResourceReader;
    this.configurationObject = configurationObject;
    this.configurators = configurators ?? getDefaultConfigurators();
  }

  /**
   * Sets {@link DataSpecification.artefacts} field for the given specification.
   * @param dataSpecificationIri Iri of the specification to set the artifacts for.
   */
  public async generateFor(
    dataSpecificationIri: string,
    singleSpecificationOnly: boolean = false,
  ): Promise<DataSpecificationArtefact[]> {
    const dataSpecification = this.dataSpecifications.find(
      dataSpecification => dataSpecification.iri === dataSpecificationIri,
    );

    if (dataSpecification === undefined) {
      throw new Error(`Data specification with IRI ${dataSpecificationIri} not found.`);
    }

    // @ts-ignore
    const localConfiguration = dataSpecification.artefactConfiguration;
    const configuration = mergeConfigurations(this.configurators, getDefaultConfiguration(getDefaultConfigurators()), this.configurationObject, localConfiguration);

    const dataSpecificationName = await this.getSpecificationDirectoryName(dataSpecificationIri);

    const dataSpecificationConfiguration = DataSpecificationConfigurator.getFromObject(configuration);
    const baseFromConfig = dataSpecificationConfiguration.publicBaseUrl ? dataSpecificationConfiguration.publicBaseUrl : null;
    this.baseURL = baseFromConfig ?? `/${singleSpecificationOnly ? "" : dataSpecificationName}`;
    if (this.baseURL.endsWith("/")) {
      this.baseURL = this.baseURL.slice(0, -1);
    }

    // Generate schemas

    const currentSchemaArtefacts: DataSpecificationArtefact[] = [];
    for (const dataStructure of dataSpecification.dataStructures) {
      const psmSchemaIri = dataStructure.id;
      let subdirectory = (singleSpecificationOnly ? "" : "/") + await this.getSchemaDirectoryName(dataSpecificationIri, psmSchemaIri);

      if (dataSpecificationConfiguration.skipStructureNameIfOnlyOne && dataSpecification.dataStructures.length === 1) {
        subdirectory = "";
      }

      let basePath = `${singleSpecificationOnly ? "" : dataSpecificationName}${subdirectory}` + "/";
      if (basePath.startsWith("/")) {
        basePath = basePath.slice(1);
      }

      currentSchemaArtefacts.push(...getSchemaArtifacts(
          psmSchemaIri,
          `${this.baseURL}${subdirectory ? "/" + subdirectory : ""}`,
          basePath,
          configuration,
          this.queryParams,
      ));
    }

    return currentSchemaArtefacts;
  }

  protected nameFromIri(iri: string): string {
    return iri.split("/").pop() as string;
  }

  protected normalizeName(name: string): string {
    return name
        .replace(/[\s/<>:"\\|?*]+/g, "-") // Windows and Linux forbidden characters
        .toLowerCase();
  }

  /**
   * Creates a directory name for data specification. The name should be taken from the package name.
   * @param dataSpecificationIri
   * @protected
   */
  protected async getSpecificationDirectoryName(dataSpecificationIri: string) {
    const dataSpecification = this.dataSpecifications.find(
        dataSpecification => dataSpecification.iri === dataSpecificationIri,
    ) as DataSpecification;

    const name = dataSpecification.label ?? {en: "unnamed"} satisfies LanguageString;

    if (name) {
      if (name["en"]) {
        return this.normalizeName(name["en"]);
      }
      // Get any value from object
      const anyValue = Object.values(name)?.[0];
      if (anyValue) {
        return this.normalizeName(anyValue);
      }
    }

    return this.nameFromIri(dataSpecificationIri);
  }

  protected async getSchemaDirectoryName(dataSpecificationIri: string, dataPsmSchemaIri: string) {
    const psmSchema = await this.store.readResource(dataPsmSchemaIri) as DataPsmSchema;

    if (psmSchema?.dataPsmTechnicalLabel && psmSchema.dataPsmTechnicalLabel.length > 0) {
      return psmSchema.dataPsmTechnicalLabel;
    }

    if (psmSchema && psmSchema.dataPsmHumanLabel) {
      if (psmSchema.dataPsmHumanLabel["en"]) {
        return this.normalizeName(psmSchema.dataPsmHumanLabel["en"]);
      }
      // Get any value from object
      const anyValue = Object.values(psmSchema.dataPsmHumanLabel)?.[0];
      if (anyValue) {
        return this.normalizeName(anyValue);
      }
    }

    return this.nameFromIri(dataSpecificationIri);
  }
}
