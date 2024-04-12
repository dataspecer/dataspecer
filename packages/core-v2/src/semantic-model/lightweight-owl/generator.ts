import {
    LanguageString,
    NamedThing,
    SemanticModelClass,
    SemanticModelEntity,
    SemanticModelGeneralization,
    SemanticModelRelationship,
} from "../concepts/concepts";
import * as N3 from "n3";
import { DataFactory, Quad_Predicate, Quad_Subject } from "n3";
import namedNode = DataFactory.namedNode;
import literal = DataFactory.literal;
import {
    isSemanticModelAttribute,
    isSemanticModelClass,
    isSemanticModelGeneralization,
    isSemanticModelRelationship,
} from "../concepts";
import { getDomainAndRange } from "../relationship-utils/utils";

function simpleIdSort(a: SemanticModelEntity, b: SemanticModelEntity) {
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Generates lightweight OWL ontology from the given entities.
 */
export function generate(entities: SemanticModelEntity[]): Promise<string> {
    const generator = new Generator();
    return generator.generate(entities);
}

const RDF_TYPE = namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");

// IRIs that basically represents owl thing and are not necessary to be included in the ontology
const OWL_THING = ["http://www.w3.org/2002/07/owl#Thing"];

class Generator {
    private writer!: N3.Writer;
    private subclasses!: SemanticModelGeneralization[];
    private entitiesMap!: Record<string, SemanticModelEntity>;

    public generate(entities: SemanticModelEntity[]): Promise<string> {
        this.writer = new N3.Writer({prefixes: {
            owl: "http://www.w3.org/2002/07/owl#",
            rdfs: "http://www.w3.org/2000/01/rdf-schema#",
            rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        }});
        const classes = entities.filter(isSemanticModelClass);
        this.entitiesMap = Object.fromEntries(entities.map(e => [e.id, e]));
        this.subclasses = entities.filter(isSemanticModelGeneralization);
        this.subclasses.sort((a, b) => a.parent < b.parent ? -1 : a.parent > b.parent ? 1 : 0);
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
        for (const subclass of this.subclasses.filter(s => s.child === entity.id)) {
            this.writer.addQuad(
                iri,
                namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf"),
                namedNode((this.entitiesMap[subclass.parent] as SemanticModelClass)?.iri ?? subclass.parent)
            );
        }
    }

    private getNodeById(id: string) {
        return namedNode(this.entitiesMap[id]?.iri ?? id);
    }

    private writeNamedThing(entity: NamedThing & SemanticModelEntity) {
        // TODO: make more robust for new approach -- ends:[{concept}, {concept, iri, name, description}]
        let iri: N3.NamedNode;
        let name: LanguageString, description: LanguageString;
        if (isSemanticModelRelationship(entity)) {
            const domain = getDomainAndRange(entity)?.domain;
            iri = namedNode(domain?.iri ?? entity.iri ?? entity.id);
            name = domain?.name ?? entity.name;
            description = domain?.description ?? entity.description;
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

        const iri = namedNode(domainEnd?.iri ?? entity.iri ?? entity.id);

        // const iri = namedNode(entity.iri ?? entity.id);
        this.writer.addQuad(iri, RDF_TYPE, namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"));
        if (isSemanticModelAttribute(entity)) {
            this.writer.addQuad(iri, RDF_TYPE, namedNode("http://www.w3.org/2002/07/owl#DatatypeProperty"));
        } else {
            this.writer.addQuad(iri, RDF_TYPE, namedNode("http://www.w3.org/2002/07/owl#ObjectProperty"));
        }

        this.writeNamedThing(entity);

        const domainConcept = domainEnd?.concept ?? null;
        const rangeConcept = rangeEnd?.concept ?? null;

        // neni tohle obracene? Jakoze range je odkud sipka smeruje a domain je kam sipka smeruje?
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
            this.writer.addQuad(
                subject,
                property,
                literal(languageString[lang]!, lang),
            );
        }
    }
}
