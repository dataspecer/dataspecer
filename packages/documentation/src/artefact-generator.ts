import { ArtefactGenerator } from "@dataspecer/generators/generator";

/**
 * Legacy interface generator serving as a placeholder for the documentation
 * generator. The real documentation generator is executed outside of the legacy
 * generator framework.
 */
export class TemplateArtifactGenerator implements ArtefactGenerator {
  static readonly IDENTIFIER = "https://schemas.dataspecer.com/generator/template-artifact";
  identifier(): string {
    return TemplateArtifactGenerator.IDENTIFIER;
  }

  async generateToStream(): Promise<void> {
    // This is a dummy generator for other legacy generators to properly link to HTML documentation.
    return;
  }

  generateToObject(): Promise<never> {
    // Not applicable for this generator - can not even be called
    throw new Error("Method not implemented.");
  }

  async generateForDocumentation(): Promise<null> {
    // Not applicable for this generator => return null
    return null;
  }
}
