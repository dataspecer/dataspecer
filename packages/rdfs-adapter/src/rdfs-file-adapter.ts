import {CimAdapter, IriProvider} from "@dataspecer/core/cim";
import {CoreResourceReader} from "@dataspecer/core/core/core-reader";
import {PimClass} from "@dataspecer/core/pim/model/pim-class";
import {RdfHttpSource} from "@dataspecer/core/io/rdf/http/http-rdf-source";
import {HttpFetch} from "@dataspecer/core/io/fetch/fetch-api";
import {RdfNode, RdfObject, RdfMemorySourceWrap} from "@dataspecer/core/core/adapter/rdf";
import {RdfMemorySource} from "@dataspecer/core/io/rdf/rdf-memory-source";
import {OWL, RDF, RDFS, SCHEMAORG, XSD} from "./rdfs-vocabulary.ts";
import {CoreResource, ReadOnlyMemoryStore} from "@dataspecer/core/core";
import {loadRdfsEntityToResource} from "./entity-adapters/rdfs-entity-adapter.ts";
import {PimAssociation, PimAssociationEnd, PimAttribute} from "@dataspecer/core/pim/model";

const UNION_DOMAIN_PREFIX = "https://dataspecer.com/cim/abstract-class-union-domain/";
const UNION_RANGE_PREFIX = "https://dataspecer.com/cim/abstract-class-union-range/";

function rdfSourceProperty(source: RdfMemorySource, iri: string, properties: string[]): RdfObject[] {
    const result = [] as RdfObject[];
    for (const property of properties) {
        const objects = source.property(iri, property);
        objects.forEach(object => result.find(o => o.value === object.value) || result.push(object));
    }
    return result;
}

function rdfSourceReverseProperty(source: RdfMemorySource, iris: string[], properties: string[]): RdfNode[] {
    const result = [] as RdfNode[];
    for (const iri of iris) {
        for (const property of properties) {
            const objects = source.reverseProperty(property, iri);
            objects.forEach(object => result.find(o => o.value === object.value) || result.push(object));
        }
    }
    return result;
}

function unique<T>(values: T[]): T[] {
    return [...new Set(values)];
}

interface Cim {
    readonly classes: PimClass[];

    readonly entities: Record<string, CoreResource>;
}

/**
 * CIM adapter that reads RDFS or RDFS-like vocabularies a single file on the Internet.
 */
export class RdfsFileAdapter implements CimAdapter {
    protected readonly urls: string[];
    protected readonly httpFetch: HttpFetch;
    protected source: Promise<RdfHttpSource> | null = null;
    protected cim: Promise<Cim> | null = null;
    protected iriProvider!: IriProvider;

    public options = {
        classType: [RDFS.Class, OWL.Class],
        propertyDomain: [RDFS.domain],
        propertyDomainIncludes: [SCHEMAORG.domainIncludes],
        propertyRange: [RDFS.range],
        propertyRangeIncludes: [SCHEMAORG.rangeIncludes],
        property: [RDF.property, OWL.DatatypeProperty, OWL.ObjectProperty],
    }

    constructor(url: string[], httpFetch: HttpFetch) {
        this.urls = url;
        this.httpFetch = httpFetch;
    }

    setIriProvider(iriProvider: IriProvider): void {
        this.iriProvider = iriProvider;
    }

    /**
     * Maps IRI to a datatype used in Dataspecer. If the IRI does not represent a datatype, undefined is returned.
     * If the datatype is unknown, null is returned.
     */
    protected mapDatatype(iri: string): string | null | undefined {
        const mapping = {
            [RDFS.Literal]: RDFS.Literal,
            [RDF.langString]: RDF.langString,

            [SCHEMAORG.Boolean]: XSD.boolean,
            [SCHEMAORG.Date]: XSD.date,
            [SCHEMAORG.DateTime]: XSD.dateTime,
            [SCHEMAORG.Number]: XSD.decimal,
            [SCHEMAORG.Text]: XSD.string,
            [SCHEMAORG.Time]: XSD.time,
        }

        if (iri.startsWith("http://www.w3.org/2001/XMLSchema#")) {
            return iri;
        }

        if (Object.hasOwn(mapping, iri)) {
            return mapping[iri];
        }

        if (iri.startsWith("http://www.w3.org/2001/XMLSchema#")) return iri;

        return undefined;
    }

    /**
     * Fetches and parses data and returns CIM model
     * @protected
     */
    protected async getFreshCim(): Promise<Cim> {
        const source = new RdfHttpSource();
        const op = this.urls.map(url => source.fetch(this.httpFetch, url, undefined));
        await Promise.all(op); // We need to wait for all fetches because one class may be defined across multiple files

        let entities = {} as Record<string, CoreResource>;

        let connectedClassesIris = new Set<string>();

        // PROCESS PROPERTIES (attributes and associations)

        const rdfProperties = rdfSourceReverseProperty(source, this.options.property, [RDF.type]);

        for (const rdfProperty of rdfProperties) {
            const propertyIri = rdfProperty.value;
            const entity = RdfMemorySourceWrap.forIri(propertyIri, source);

            const {resources: associationResources, connectedClasses} = this.loadRdfsProperty(entity);
            connectedClasses.filter(cls => cls.includes("://")).forEach(iri => connectedClassesIris.add(iri));
            for (const resource of associationResources) {
                entities[resource.iri!] = resource;
            }
        }

        // PROCESS CLASSES

        const classesIris = rdfSourceReverseProperty(source, this.options.classType, [RDF.type]).filter(node => node.termType === "NamedNode").map(r => r.value);
        const classesToProcess = [...classesIris];
        let c: string;
        while (c = classesToProcess.pop()!) {
            const subClasses = source.reverseProperty(RDFS.subClassOf, c);
            subClasses.forEach(s => {
                if (!classesIris.includes(s.value)) {
                    if (s.termType === "NamedNode") {
                        classesIris.push(s.value);
                    }
                    classesToProcess.push(s.value);
                }
            });
        }

        classesIris.push(OWL.Thing);
        // classesIris.push(...connectedClassesIris);

        const classes = [... new Set(classesIris)].map(iri => this.loadRdfsClass(iri, source));
        entities = {...entities, ...Object.fromEntries(classes.map(c => [c.iri, c]))};

        return {classes, entities};
    }

    protected getCim(): Promise<Cim> {
        if (!this.cim) {
            this.cim = this.getFreshCim();
        }
        return this.cim;
    }


    /**
     * Loads class or anonymous class
     */
    protected loadRdfsClass(cimIri: string, source: RdfMemorySource): PimClass {
        const resource = new PimClass();
        resource.iri = this.iriProvider.cimToPim(cimIri);
        resource.pimInterpretation = cimIri;

        if (cimIri === OWL.Thing) {
            resource.pimHumanLabel = {en: `owl:Thing`};
        } else if (cimIri.startsWith(UNION_DOMAIN_PREFIX) || cimIri.startsWith(UNION_RANGE_PREFIX)) { // Anonymous class
            const isDomain = cimIri.startsWith(UNION_DOMAIN_PREFIX);
            const propertyIri = isDomain ? cimIri.substring(UNION_DOMAIN_PREFIX.length) : cimIri.substring(UNION_RANGE_PREFIX.length);

            const property = new PimAttribute();
            loadRdfsEntityToResource(RdfMemorySourceWrap.forIri(propertyIri as string, source), this.iriProvider, property);

            resource.pimHumanLabel = Object.fromEntries(Object.entries(property.pimHumanLabel ?? {})
                .map(([lang, text]) => [lang, `[A] ${isDomain ? "Domain" : "Range"} of ${text}`]));
            resource.pimHumanDescription = property.pimHumanDescription;
            (resource as any).pimHumanLabelProperty = (property as any).pimHumanLabelProperty ?? null;
            (resource as any).pimHumanDescriptionProperty = (property as any).pimHumanDescriptionProperty ?? null;
        } else { // Existing class in CIM
            const entity = RdfMemorySourceWrap.forIri(cimIri, source);
            loadRdfsEntityToResource(entity, this.iriProvider, resource);
            resource.pimExtends = unique([
                ...resource.pimExtends,
                ...(entity.nodes(RDFS.subClassOf)).map(this.iriProvider.cimToPim),
            ]);

            // Add anonymous classes for domains
            const propertiesHavingAsDomain = rdfSourceReverseProperty(source, [cimIri], [...this.options.propertyDomain, ...this.options.propertyDomainIncludes]);
            const propertyIrisWithAnonymousDomainClass = [] as string[];
            for (const prop of propertiesHavingAsDomain) {
                const domain = rdfSourceProperty(source, prop.value, [...this.options.propertyDomain, ...this.options.propertyDomainIncludes]);
                if (domain.length > 1) {
                    propertyIrisWithAnonymousDomainClass.push(prop.value);
                }
            }
            resource.pimExtends.push(...propertyIrisWithAnonymousDomainClass.map(iri => this.iriProvider.cimToPim(UNION_DOMAIN_PREFIX + iri)));

            // Add anonymous classes for ranges
            const propertiesHavingAsRange = rdfSourceReverseProperty(source, [cimIri], [...this.options.propertyRange, ...this.options.propertyRangeIncludes]);
            const propertyIrisWithAnonymousRangeClass = [] as string[];
            for (const prop of propertiesHavingAsRange) {
                const range = rdfSourceProperty(source, prop.value, [...this.options.propertyRange, ...this.options.propertyRangeIncludes]);
                if (range.length > 1 && range.some(r => this.mapDatatype(r.value) === undefined)) { // Hotfix for all-primitive ranges
                    propertyIrisWithAnonymousRangeClass.push(prop.value);
                }
            }
            resource.pimExtends.push(...propertyIrisWithAnonymousRangeClass.map(iri => this.iriProvider.cimToPim(UNION_RANGE_PREFIX + iri)));
        }

        resource.pimExtends.push(this.iriProvider.cimToPim(OWL.Thing));

        return resource;
    }

    async search(searchQuery: string): Promise<PimClass[]> {
        const cim = await this.getCim();

        const regExp = new RegExp(searchQuery, "i");

        const filteredClasses = cim.classes.filter(c => c).filter((pimClass) => {
            return regExp.test(pimClass.pimHumanLabel?.en ?? "") || regExp.test(pimClass.pimInterpretation!);
        });

        filteredClasses.sort((a, b) => (a.pimHumanLabel?.en?.length ?? 1000) - (b.pimHumanLabel?.en?.length ?? 1000));

        return filteredClasses;
    }
    async getClass(cimIri: string): Promise<PimClass | null> {
        const cim = await this.getCim();
        return cim.classes.find(c => c.pimInterpretation === cimIri) ?? null;
    }
    async getSurroundings(cimIri: string): Promise<CoreResourceReader> {
        const cim = await this.getCim();
        return ReadOnlyMemoryStore.create(cim.entities);
    }
    async getFullHierarchy(cimIri: string): Promise<CoreResourceReader> {
        const cim = await this.getCim();
        return ReadOnlyMemoryStore.create(cim.entities);
    }
    async getResourceGroup(cimIri: string): Promise<string[]> {
        return [];
    }

    /**
     * So far we suppose that only one domain and one range node is present. If the range node looks like primitive
     * type, we return attribute, otherwise we return association.
     */
    loadRdfsProperty(
        entity: RdfMemorySourceWrap,
    ): {
        resources: CoreResource[],
        connectedClasses: string[],
    } {
        const resources = [] as CoreResource[];
        const connectedClasses = [] as string[];

        const allDomainProperties = [
            ...this.options.propertyDomain,
            ...this.options.propertyDomainIncludes,
        ];
        const allRangeProperties = [
            ...this.options.propertyRange,
            ...this.options.propertyRangeIncludes,
        ];
        let domainNodes = [] as string[];
        for (const domainProp of allDomainProperties) {
            domainNodes.push(...entity.nodes(domainProp));
        }
        let rangeNodes = [] as string[];
        for (const rangeProp of allRangeProperties) {
            rangeNodes.push(...entity.nodes(rangeProp));
        }

        // // Treat rdfs:Resource as owl:Thing
        // if (domainNodes.includes(RDFS.Resource)) {
        //     domainNodes = domainNodes.map((n, i) => n === RDFS.Resource ? OWL.Thing : n);
        // }
        // if (rangeNodes.includes(RDFS.Resource)) {
        //     rangeNodes = rangeNodes.map((n, i) => n === RDFS.Resource ? OWL.Thing : n);
        // }

        // CIM IRI of the domain class
        let domainClassIri: string;
        if (domainNodes.length === 0) {
            domainClassIri = OWL.Thing;
        } else if (domainNodes.length === 1) {
            domainClassIri = domainNodes[0];
        } else {
            domainClassIri = UNION_DOMAIN_PREFIX + entity.iri;
        }

        // CIM IRI of the range class or IRI of the datatype
        let rangeClassIri: string | null;
        let isAttribute = false;
        let isAssociation = true;

        if (rangeNodes.length === 0) {
            rangeClassIri = OWL.Thing;
            isAttribute = true;
        } else if (rangeNodes.length === 1) {
            const mappedDatatype = this.mapDatatype(rangeNodes[0]);
            if (mappedDatatype !== undefined) {
                rangeClassIri = mappedDatatype;
                isAttribute = true;
                isAssociation = false;
            } else {
                rangeClassIri = rangeNodes[0];
            }
        } else {
            // check if all range nodes are attributes
            isAttribute = true;
            isAssociation = false;
            rangeClassIri = null;
            for (const rangeNode of rangeNodes) {
                const datatype = this.mapDatatype(rangeNode);
                if (datatype === undefined) {
                    isAttribute = false;
                    isAssociation = true;
                    rangeClassIri = UNION_RANGE_PREFIX + entity.iri;
                    break;
                }
                rangeClassIri = datatype; // Set last value because we can set only one of them
            }
        }

        const type = entity.property(RDF.type);
        if (type.some(v => v.value === OWL.DatatypeProperty)) {
            // It must be attribute
            isAttribute = true;
            isAssociation = false;
        } else if (type.some(v => v.value === OWL.ObjectProperty)) {
            // It must be association
            isAttribute = false;
            isAssociation = true
        }

        if (isAttribute) {
            const attribute = new PimAttribute();
            loadRdfsEntityToResource(entity, this.iriProvider, attribute);
            attribute.iri = this.iriProvider.cimToPim(entity.iri) + (isAssociation ? "#attribute" : ""); // to have unique ids
            attribute.pimOwnerClass = this.iriProvider.cimToPim(domainClassIri);
            attribute.pimDatatype = rangeClassIri === OWL.Thing ? RDFS.Literal : rangeClassIri ?? RDFS.Literal;

            attribute["pimExtends"] = entity.property(RDFS.subPropertyOf).map(e => this.iriProvider.cimToPim(e.value));

            connectedClasses.push(domainClassIri);
            resources.push(attribute);
        }

        if (isAssociation) {
            rangeClassIri = rangeClassIri!; // Only attribute may have null

            const domain = new PimAssociationEnd();
            domain.iri = this.iriProvider.cimToPim(entity.iri + "#domain");
            domain.pimPart = this.iriProvider.cimToPim(domainClassIri);

            const range = new PimAssociationEnd();
            range.iri = this.iriProvider.cimToPim(entity.iri + "#range");
            range.pimPart = this.iriProvider.cimToPim(rangeClassIri);

            const association = new PimAssociation();
            loadRdfsEntityToResource(entity, this.iriProvider, association);
            association.pimIsOriented = true;

            association.pimEnd = [domain.iri, range.iri];

            association["pimExtends"] = entity.property(RDFS.subPropertyOf).map(e => this.iriProvider.cimToPim(e.value));

            connectedClasses.push(domainClassIri, rangeClassIri);
            resources.push(domain, association, range);
        }

        return {resources, connectedClasses};
    }
}
