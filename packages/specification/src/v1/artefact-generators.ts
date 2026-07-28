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
import {TemplateArtifactGenerator} from "@dataspecer/documentation";
import { Configurator } from "@dataspecer/core/configuration/configurator";
import { DataSpecificationConfigurator } from "@dataspecer/core/data-specification/configuration";
import { CsvConfigurator } from "@dataspecer/csv/configuration";
import { JsonConfigurator } from "@dataspecer/json/configuration";
import { XmlConfigurator } from "@dataspecer/xml/configuration";

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