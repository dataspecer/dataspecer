import { pathRelative } from "@dataspecer/core/core/utilities/path-relative";
import { MemoryStreamDictionary } from "@dataspecer/core/io/stream/memory-stream-dictionary";
import { TemplateArtifactGenerator } from "../index.ts";
import { PackageContext } from "./views.ts";
import { HandlebarsAdapter } from "@dataspecer/handlebars-adapter";

// TODO: This is temporary workaroud for mapping artefacts to text.

const artefactTitle = {
    "http://example.com/generator/json-schema": {
        cs: "JSON schéma",
        en: "JSON schema",
    },
    "https://schemas.dataspecer.com/generator/json-example": {
        cs: "Příklad JSONu",
        en: "JSON example",
    },
    "http://dataspecer.com/generator/json-ld": {
        cs: "JSON-LD kontext",
        en: "JSON-LD context",
    },
    "http://example.com/generator/xml-common-schema": {
        cs: "XML sdílené koncepty",
        en: "XML shared concepts",
    },
    "http://example.com/generator/xml-schema": {
        cs: "XML schéma",
        en: "XML schema",
    },
    "http://example.com/generator/xslt-lifting": {
        cs: "XSLT lifting",
        en: "XSLT lifting",
    },
    "http://example.com/generator/xslt-lowering": {
        cs: "XSLT lowering",
        en: "XSLT lowering",
    },
    "http://example.com/generator/csv-schema": {
        cs: "CSV schéma",
        en: "CSV schema",
    },
    "http://example.com/generator/rdf-to-csv": {
        cs: "RDF to CSV",
        en: "RDF to CSV",
    },
    "http://example.com/generator/sparql": {
        cs: "SPARQL",
        en: "SPARQL",
    },
    "https://schemas.dataspecer.com/generator/shacl": {
        cs: "SHACL",
        en: "SHACL",
    },
    "https://schemas.dataspecer.com/generator/openapi": {
        cs: "OpenAPI",
        en: "OpenAPI",
    },
    "https://schemas.dataspecer.com/generator/shex": {
        cs: "ShEx",
        en: "ShEx",
    },
    "plant-uml": {
        cs: "PlantUML diagram",
        en: "PlantUML diagram",
    },
    "plant-uml/image": {
        cs: "Konceptuální diagram",
        en: "Conceptual diagram",
    },
    // todo: do not identify artifacts by generator
    "https://schemas.dataspecer.com/generator/template-artifact": {
        cs: "Dokumentace",
        en: "Documentation",
    },
    "https://schemas.dataspecer.com/generator/shex-map": {
        cs: "ShEx Map",
        en: "ShEx Map",
    },
    "https://schemas.dataspecer.com/generator/LDkit": {
        cs: "LDkit ukázková aplikace",
        en: "LDkit example application",
    },
};

export function prepareArtifacts(
    view: object,
    context: PackageContext,
    adapter: HandlebarsAdapter,
) {
    return {...view, ...getArtifactsView(context, context.specification.artefacts.map(a => a.iri), adapter)};
}

export function getArtifactsView(
    context: PackageContext,
    artifactIds: string[],
    adapter: HandlebarsAdapter,
) {
    const baseUrl = context.artefact.publicUrl;

    const artifacts = context.specification.artefacts.filter(a => artifactIds.includes(a.iri)).map(artifact => ({
        ...artifact,
        relativePath: pathRelative(baseUrl, artifact.publicUrl),
        relativePathAsText: pathRelative(baseUrl, artifact.publicUrl) || "#",
        title: artefactTitle[artifact.generator] ?? {},
        getArtifact: adapter.async(async () => {
            const stream = new MemoryStreamDictionary();
            const generator = await context.context.createGenerator(artifact.generator);
            await generator.generateToStream(context.context, artifact, context.specification, stream);
            const files = await stream.list();
            const result = [];
            for (const file of files) {
                result.push({
                    name: file,
                    content: await stream.readPath(file).read(),
                });
            }
            return result;
        }),
        getDocumentation: adapter.async(async () => {
            const generator = await context.context.createGenerator(artifact.generator);
            return await generator.generateForDocumentation(
                context.context,
                artifact,
                context.specification,
                TemplateArtifactGenerator.IDENTIFIER,
                {
                    artifact: context.artefact,
                    partial: adapter.partial,
                    adapter: adapter,
                }
            );
        }),
    }));

    const artifact = Object.fromEntries(artifacts.map(a => [a.generator.split("/").pop(), a]));

    return {artifacts, artifact};
}