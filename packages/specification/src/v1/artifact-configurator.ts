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

    const baseOutputPath = singleSpecificationOnly ? "" : `${dataSpecificationName}/`;

    const htmlDoc = new DataSpecificationDocumentation();
    htmlDoc.iri = `${dataSpecificationIri}#respec`;
    htmlDoc.generator = "https://schemas.dataspecer.com/generator/template-artifact";
    const respecFileName = dataSpecificationConfiguration.renameArtifacts?.[htmlDoc.generator] ?? "en/index.html";
    htmlDoc.outputPath = `${baseOutputPath}${respecFileName}`;
    htmlDoc.publicUrl = `${this.baseURL}${respecFileName}${this.queryParams}`;
    htmlDoc.artefacts = artifacts.map(a => a.iri!);
    htmlDoc.configuration = configuration;
    artifacts.push(htmlDoc);

    return artifacts;
  }
}
