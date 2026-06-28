import { mergeConfigurations } from "@dataspecer/core/configuration/utils";
import { DataSpecificationConfigurator } from "@dataspecer/core/data-specification/configuration";
import { DataSpecificationArtefact, DataSpecificationDocumentation } from "@dataspecer/core/data-specification/model";
import { DefaultArtifactConfigurator } from "./default-artifact-configurator.ts";

export class ArtifactConfigurator extends DefaultArtifactConfigurator {
  public async generateFor(
    dataSpecificationIri: string,
    singleSpecificationOnly: boolean = false,
  ): Promise<DataSpecificationArtefact[]> {
    const artifacts = await super.generateFor(dataSpecificationIri, singleSpecificationOnly);

    const dataSpecification = this.dataSpecifications.find(
        dataSpecification => dataSpecification.iri === dataSpecificationIri,
    );

    if (dataSpecification === undefined) {
      throw new Error(`Data specification with IRI ${dataSpecificationIri} not found.`);
    }

    // @ts-ignore
    const localConfiguration = dataSpecification.artefactConfiguration;
    const configuration = mergeConfigurations(this.configurators, this.configurationObject, localConfiguration);

    const dataSpecificationName = await this.getSpecificationDirectoryName(dataSpecificationIri);

    const dataSpecificationConfiguration = DataSpecificationConfigurator.getFromObject(configuration);
    const generatorsEnabledByDefault = dataSpecificationConfiguration.generatorsEnabledByDefault!;

    const baseOutputPath = singleSpecificationOnly ? "" : `${dataSpecificationName}/`;

    if ((dataSpecificationConfiguration.useGenerators?.["respec"] ?? generatorsEnabledByDefault) !== false) {
      // Respec
      const respec = new DataSpecificationDocumentation();
      respec.iri = `${dataSpecificationIri}#respec`;
      respec.generator = "https://schemas.dataspecer.com/generator/template-artifact";
      const respecFileName = dataSpecificationConfiguration.renameArtifacts?.[respec.generator] ?? "en/index.html";
      respec.outputPath = `${baseOutputPath}${respecFileName}`;
      respec.publicUrl = `${this.baseURL}${respecFileName}${this.queryParams}`;
      respec.artefacts = artifacts.map(a => a.iri!);
      // @ts-ignore
      respec.templateType = null;
      respec.configuration = configuration;
      artifacts.push(respec);
    }

    return artifacts;
  }
}
