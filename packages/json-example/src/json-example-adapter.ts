import { ArtefactGeneratorContext } from "@dataspecer/core/generator";
import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model/data-specification-artefact.js";
import { generate } from "json-schema-faker";

export class JsonExampleAdapter {
  protected schema: string;
  protected context: ArtefactGeneratorContext;
  protected artefact: DataSpecificationArtefact;
  protected baseURL: string = "";

  constructor(schema: string, context: ArtefactGeneratorContext, artefact: DataSpecificationArtefact) {
    this.schema = schema;
    this.context = context;
    this.artefact = artefact;
  }

  async generateJsonData(): Promise<object> {
    const json = JSON.parse(this.schema);
    const options = { requiredOnly: true, useExamplesValue: true };
    const generatedJson = await generate(json, options) as object;

    if (generatedJson == null) {
      return {};
    } else {
      return generatedJson;
    }
  }
}
