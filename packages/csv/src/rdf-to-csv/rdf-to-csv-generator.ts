import {
    ArtefactGenerator,
    ArtefactGeneratorContext
} from "@dataspecer/generators/generator";
import {
    DataSpecification,
    DataSpecificationArtefact,
    DataSpecificationSchema
} from "@dataspecer/core/data-specification/model";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { RDF_TO_CSV } from "./rdf-to-csv-vocabulary.ts";
import { SparqlSelectQuery } from "@dataspecer/sparql-query";
import { writeSparqlQuery } from "@dataspecer/sparql-query";
import { CsvSchemaGenerator } from "../csv-schema/index.ts";
import {
    buildSingleTableQuery,
    buildMultipleTableQueries
} from "./rdf-to-csv-query-builder.ts";
import { SingleTableSchema } from "../csv-schema/csv-schema-model.ts";
import {
    assertFailed,
    assertNot
} from "@dataspecer/core/core";
import { transformStructureModel } from "@dataspecer/generators/structure-model/transformation";
import {
    CsvConfiguration,
    CsvConfigurator,
    DefaultCsvConfiguration
} from "../configuration.ts";

export class RdfToCsvGenerator implements ArtefactGenerator {

    identifier(): string {
        return RDF_TO_CSV.Generator;
    }

    async generateToStream(
        context: ArtefactGeneratorContext,
        artefact: DataSpecificationArtefact,
        specification: DataSpecification,
        output: StreamDictionary
    ): Promise<void> {
        const result = await this.generateToObject(context, artefact, specification);
        if (Array.isArray(result)) {
            let counter = 1;
            for (const query of result) {
                const stream = output.writePath(artefact.outputPath + `query_${counter}.sparql`);
                await writeSparqlQuery(query, stream);
                await stream.close();
                counter++;
            }
        }
        else {
            const stream = output.writePath(artefact.outputPath + "query.sparql");
            await writeSparqlQuery(result, stream);
            await stream.close();
        }
    }

    async generateToObject(
        context: ArtefactGeneratorContext,
        artefact: DataSpecificationArtefact,
        specification: DataSpecification
    ): Promise<SparqlSelectQuery | SparqlSelectQuery[]> {
        if (!DataSpecificationSchema.is(artefact)) {
            assertFailed("Invalid artefact type.")
        }
        const schemaArtefact = artefact as DataSpecificationSchema;
        const conceptualModel = context.conceptualModels[specification.pim];
        const configuration = CsvConfigurator.merge(
            DefaultCsvConfiguration,
            CsvConfigurator.getFromObject(schemaArtefact.configuration)
        ) as CsvConfiguration;
        assertNot(
            conceptualModel === undefined,
            `Missing conceptual model ${specification.pim}.`);
        let model = context.structureModels[schemaArtefact.psm];
        assertNot(
            model === undefined,
            `Missing structure model ${schemaArtefact.psm}.`);
        model = Object.values(context.conceptualModels).reduce(
            (model, conceptualModel) => transformStructureModel(conceptualModel, model, Object.values(context.specifications)),
            model
        );
        if (configuration.enableMultipleTableSchema) return buildMultipleTableQueries(model);
        else return buildSingleTableQuery(model);
    }

    async generateForDocumentation(
        context: ArtefactGeneratorContext,
        artefact: DataSpecificationArtefact,
        specification: DataSpecification,
        documentationIdentifier: string,
        callerContext: unknown
    ): Promise<unknown | null> {
        return null; // unnecessary, implemented in CSV schema
    }
}
