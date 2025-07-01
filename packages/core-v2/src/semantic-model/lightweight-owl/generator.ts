import {
    LanguageString,
    NamedThing,
    SemanticModelClass,
    SemanticModelEntity,
    SemanticModelGeneralization,
    SemanticModelRelationship,
} from "../concepts/concepts.ts";
import * as N3 from "n3";
import { DataFactory, Quad_Predicate, Quad_Subject } from "n3";
const namedNode = DataFactory.namedNode;
const literal = DataFactory.literal;
import {
    isSemanticModelAttribute,
    isSemanticModelClass,
    isSemanticModelGeneralization,
    isSemanticModelRelationship,
} from "../concepts/index.ts";
import { getDomainAndRange } from "../relationship-utils/utils.ts";
import { PROF } from "./vocabulary.ts";

function simpleIdSort(a: SemanticModelEntity, b: SemanticModelEntity) {
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

interface Context {
    baseIri: string;
    iri: string;
}

/**
 * Generates lightweight OWL ontology from the given entities.
 */
export function generate(entities: SemanticModelEntity[], context: Context): Promise<string> {
    const generator = new Generator(context);
    return generator.generate(entities);
}

const RDF_TYPE = namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");

// IRIs that basically represents owl thing and are not necessary to be included in the ontology
const OWL_THING = ["http://www.w3.org/2002/07/owl#Thing"];

function getRelationshipIri(relationship: SemanticModelRelationship) {
    const rangeEnd = getDomainAndRange(relationship)?.range;
    return rangeEnd?.iri ?? relationship.iri ?? relationship.id;
}

class Generator {
    private writer!: N3.Writer;
    private generalizations!: SemanticModelGeneralization[];
    private entitiesMap!: Record<string, SemanticModelEntity>;

    constructor(private context: Context) {}

    public generate(entities: SemanticModelEntity[]): Promise<string> {
        this.writer = new N3.Writer();
        this.writer.addPrefixes({
            owl: "http://www.w3.org/2002/07/owl#",
            prof: "http://www.w3.org/ns/dx/prof/",
            rdfs: "http://www.w3.org/2000/01/rdf-schema#",
            rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            ... this.context?.baseIri ? { "": this.context.baseIri } : {},
        });

        // Write the ontology
        this.writer.addQuad(
            namedNode(this.context.iri),
            RDF_TYPE,
            namedNode("http://www.w3.org/2002/07/owl#Ontology")
        );
        this.writer.addQuad(
            namedNode(this.context.iri),
            RDF_TYPE,
            PROF.Profile
        );

        const classes = entities.filter(isSemanticModelClass);
        this.entitiesMap = Object.fromEntries(entities.map(e => [e.id, e]));
        this.generalizations = entities.filter(isSemanticModelGeneralization);
        this.generalizations.sort((a, b) => a.parent < b.parent ? -1 : a.parent > b.parent ? 1 : 0);
        classes.sort(simpleIdSort);
        const properties = entities.filter(isSemanticModelRelationship);
        // TODO: what about application profiles

        const writtenProperties = new Set<string>();
        for (const cls of classes) {
            this.writeClass(cls);
            const propertiesOfThisClass = properties.filter(p => p.ends[0]?.concept === cls.id);
            propertiesOfThisClass.sort(simpleIdSort);
            for (const property of propertiesOfThisClass) {
                if (writtenProperties.has(property.iri ?? property.id)) {
                    continue;
                }
                this.writeProperty(property);
                writtenProperties.add(property.id);
            }
        }

        // Write other properties that do not have a domain from this vocabulary
        for (const property of properties) {
            if (writtenProperties.has(property.iri ?? property.id)) {
                continue;
            }
            this.writeProperty(property);
            writtenProperties.add(property.id);
        }

        return new Promise((resolve, reject) => this.writer.end((error, result) => resolve(result)));
    }

    private writeClass(entity: SemanticModelClass) {
        const iri = namedNode(entity.iri ?? entity.id);
        this.writer.addQuad(
            iri,
            RDF_TYPE,
            namedNode("http://www.w3.org/2002/07/owl#Class")
        );
        // Also rdfs class
        this.writer.addQuad(
            iri,
            RDF_TYPE,
            namedNode("http://www.w3.org/2000/01/rdf-schema#Class")
        );
        this.writeNamedThing(entity);
        this.writer.addQuad(
            iri,
            namedNode("http://www.w3.org/2000/01/rdf-schema#isDefinedBy"),
            namedNode(this.context.iri),
        );
        for (const subclass of this.generalizations.filter(s => s.child === entity.id)) {
            this.writer.addQuad(
                iri,
                namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf"),
                namedNode((this.entitiesMap[subclass.parent] as SemanticModelClass)?.iri ?? subclass.parent)
            );
        };
    }

    private getNodeById(id: string) {
        return namedNode(this.entitiesMap[id]?.iri ?? id);
    }

    private writeNamedThing(entity: NamedThing & SemanticModelEntity) {
        // TODO: make more robust for new approach -- ends:[{concept}, {concept, iri, name, description}]
        let iri: N3.NamedNode;
        let name: LanguageString, description: LanguageString;
        if (isSemanticModelRelationship(entity)) {
            const range = getDomainAndRange(entity)?.range;
            iri = namedNode(range?.iri ?? entity.iri ?? entity.id);
            name = range?.name ?? entity.name;
            description = range?.description ?? entity.description;
        } else {
            iri = namedNode(entity.iri ?? entity.id);
            name = entity.name;
            description = entity.description;
        }

        // const iri = namedNode(entity.iri ?? entity.id);
        this.writeLanguageString(iri, namedNode("http://www.w3.org/2000/01/rdf-schema#label"), name);
        this.writeLanguageString(iri, namedNode("http://www.w3.org/2000/01/rdf-schema#comment"), description);
    }

    private writeProperty(entity: SemanticModelRelationship) {
        const domainEnd = getDomainAndRange(entity)?.domain;
        const rangeEnd = getDomainAndRange(entity)?.range;
        const iri = namedNode(getRelationshipIri(entity));

        // const iri = namedNode(entity.iri ?? entity.id);
        this.writer.addQuad(iri, RDF_TYPE, namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"));
        if (isSemanticModelAttribute(entity)) {
            this.writer.addQuad(iri, RDF_TYPE, namedNode("http://www.w3.org/2002/07/owl#DatatypeProperty"));
        } else {
            this.writer.addQuad(iri, RDF_TYPE, namedNode("http://www.w3.org/2002/07/owl#ObjectProperty"));
        }

        this.writeNamedThing(entity);

        this.writer.addQuad(
            iri,
            namedNode("http://www.w3.org/2000/01/rdf-schema#isDefinedBy"),
            namedNode(this.context.iri),
        );

        for (const generalization of this.generalizations.filter(s => s.child === entity.id)) {
            this.writer.addQuad(
                iri,
                namedNode("http://www.w3.org/2000/01/rdf-schema#subPropertyOf"),
                namedNode(this.entitiesMap[generalization.parent] ? getRelationshipIri(this.entitiesMap[generalization.parent] as SemanticModelRelationship) : generalization.parent)
            );
        };

        const domainConcept = domainEnd?.concept ?? null;
        const rangeConcept = rangeEnd?.concept ?? null;

        if (domainConcept) {
            const domain = this.getNodeById(domainConcept);
            if (!OWL_THING.includes(domain.value)) {
                this.writer.addQuad(iri, namedNode("http://www.w3.org/2000/01/rdf-schema#domain"), domain);
            }
        }
        if (rangeConcept) {
            const range = this.getNodeById(rangeConcept!);
            if (!OWL_THING.includes(range.value)) {
                if (rangeConcept) {
                    this.writer.addQuad(iri, namedNode("http://www.w3.org/2000/01/rdf-schema#range"), range);
                }
            }
        }
    }

    private writeLanguageString(subject: Quad_Subject, property: Quad_Predicate, languageString: LanguageString) {
        const languages = Object.keys(languageString);
        languages.sort();
        for (const lang of languages) {
            if (!languageString[lang]) {
                continue;
            }
            this.writer.addQuad(
                subject,
                property,
                literal(languageString[lang]!, lang),
            );
        }
    }
}
