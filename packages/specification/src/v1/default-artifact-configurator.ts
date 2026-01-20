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
   * @param singleSpecificationOnly This affects only the technical paths of the artifacts, not their public URLs.
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
    let baseFromConfig = dataSpecificationConfiguration.publicBaseUrl ? dataSpecificationConfiguration.publicBaseUrl : null;

    // Base URL must end without slash
    this.baseURL = baseFromConfig ?? `/${singleSpecificationOnly ? "" : dataSpecificationName}`; // This is only the fallback for base URLs in ZIP without real URLs
    if (this.baseURL.endsWith("/")) {
      this.baseURL = this.baseURL.slice(0, -1);
    }

    // Generate schemas

    const currentSchemaArtefacts: DataSpecificationArtefact[] = [];
    for (const dataStructure of dataSpecification.dataStructures) {
      const psmSchemaIri = dataStructure.id;
      /**
       * This is a subdirectory inside specification, so it will be used for both URL and path in ZIP.
       * Must not start and end with slash.
       */
      let subdirectory = await this.getSchemaDirectoryName(dataSpecificationIri, psmSchemaIri);

      if (dataSpecificationConfiguration.skipStructureNameIfOnlyOne && dataSpecification.dataStructures.length === 1) {
        subdirectory = "";
      }

      // Path in ZIP
      let basePath = mergePaths(singleSpecificationOnly ? null : dataSpecificationName, subdirectory);

      currentSchemaArtefacts.push(...getSchemaArtifacts(
          psmSchemaIri,
          mergePaths(this.baseURL, subdirectory, "/"),
          ensureNonLeadingSlash(mergePaths(basePath, "/")),
          configuration,
          this.queryParams,
      ));
    }

    console.log(currentSchemaArtefacts.map(a => a.publicUrl));

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

/**
 * Merges several paths into one by handling slashes properly.
 * By default, it keeps slashes at the beginning and end of the resulting path as is.
 * If you want to force them, add "/" as first or last argument.
 */
function mergePaths(...paths: (string | null | undefined)[]) {
  let result = "";
  for (const path of paths) {
    if (path === null || path === undefined || path.length === 0) {
      continue;
    }

    if (result.length === 0) {
      result = path;
      continue;
    }

    const resultEnds = result.endsWith("/");
    const pathStarts = path.startsWith("/");

    if (resultEnds && pathStarts) {
      result += path.slice(1);
    } else if (!resultEnds && !pathStarts) {
      result += "/" + path;
    } else {
      result += path;
    }
  }
  return result;
}

function ensureNonLeadingSlash(path: string) {
  if (path.startsWith("/")) {
    return path.slice(1);
  }
  return path;
}