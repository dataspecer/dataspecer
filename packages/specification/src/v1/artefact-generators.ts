import {SparqlGenerator} from "@dataspecer/sparql-query";
import {JsonLdGenerator} from "@dataspecer/json/json-ld";
import {JsonSchemaGenerator} from "@dataspecer/json/json-schema";
import {XmlSchemaGenerator} from "@dataspecer/xml/xml-schema";
import {XmlCommonSchemaGenerator} from "@dataspecer/xml/xml-common-schema";
import {XsltLiftingGenerator, XsltLoweringGenerator} from "@dataspecer/xml/xml-transformations";
import {CsvSchemaGenerator} from "@dataspecer/csv/csv-schema";
import {RdfToCsvGenerator} from "@dataspecer/csv/rdf-to-csv";
import {ShaclGenerator} from "@dataspecer/shacl";
import {ShexGenerator, ShexMapGenerator} from "@dataspecer/shex"
import {JsonExampleGenerator} from "@dataspecer/json-example";
import {OpenapiGenerator} from "@dataspecer/openapi";
import { Configurator } from "@dataspecer/core/configuration/configurator";
import { DataSpecificationConfigurator } from "@dataspecer/core/data-specification/configuration";
import { CsvConfigurator } from "@dataspecer/csv/configuration";
import { JsonConfigurator } from "@dataspecer/json/configuration";
import { XmlConfigurator } from "@dataspecer/xml/configuration";
import type { ArtefactGenerator } from "@dataspecer/generators/generator";

/**
 * Returns all artefact generators that will be used in the application.
 * This is the place to register your own artefact generators if you need to.
 */
export function getArtefactGenerators() {
    return [
        // Standalone generators
        new JsonLdGenerator(),
        new JsonSchemaGenerator(),
        new JsonExampleGenerator(),
        new XmlSchemaGenerator(),
        new XmlCommonSchemaGenerator(),
        new XsltLoweringGenerator(),
        new XsltLiftingGenerator(),
        new CsvSchemaGenerator(),
        new RdfToCsvGenerator(),
        new SparqlGenerator(),
        new ShaclGenerator(),
        new OpenapiGenerator(),
        new TemplateArtifactGenerator(),

        // Generators that need backend support
        new ShexGenerator(),
        new ShexMapGenerator(),
    ];
}

/**
 * Returns all configurators for generator families that will be used in the
 * application.
 * This is the place to register your own artefact generators if you need to.
 */
export function getDefaultConfigurators(): Configurator[] {
    return [
        JsonConfigurator,
        CsvConfigurator,
        XmlConfigurator,
        DataSpecificationConfigurator,
    ]
}

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
