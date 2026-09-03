import {
    idColumnTitle,
    refColumnTitle,
    leftRefColTitle,
    rightRefColTitle,
    nameSeparator,
    TableUrlGenerator
} from "../csv-schema/csv-schema-model-adapter.ts";
import {
    SparqlSelectQuery,
    SparqlNode,
    SparqlQNameNode,
    SparqlUriNode,
    SparqlVariableNode,
    SparqlTriple,
    SparqlPattern,
    SparqlOptionalPattern,
    SparqlElement
} from "@dataspecer/sparql-query";
import { RDF_TYPE_URI } from "@dataspecer/sparql-query";
import { csvwContext } from "../csv-schema/csvw-context.ts";
import { assertFailed } from "@dataspecer/core/core";
import {
    StructureModel,
    StructureModelClass
} from "@dataspecer/generators/structure-model/model";

/**
 * This class systematically generates variable names for SPARQL queries.
 */
class VariableGenerator {
    private num = 0;

    getNext(): SparqlVariableNode {
        this.num++;
        const varNode = new SparqlVariableNode();
        varNode.variableName = "v" + this.num.toString();
        return varNode;
    }
}

/**
 * Creates SPARQL queries for multiple table CSV schema.
 * @param model Structure model of the CSV schema and the SPARQL queries
 */
export function buildMultipleTableQueries(
    model: StructureModel
) : SparqlSelectQuery[] {
    const prefixes: Record<string, string> = {};
    const where = new SparqlPattern();
    where.elements = [];
    const selects: string[][] = [];
    const varGen = new VariableGenerator();
    const urlGen = new TableUrlGenerator();
    buildQueriesRecursive(prefixes, where, selects, model.roots[0].classes[0], varGen, urlGen);

    const queries: SparqlSelectQuery[] = [];
    for (const select of selects) {
        const query = new SparqlSelectQuery();
        query.prefixes = prefixes;
        query.select = select;
        query.where = where;
        queries.push(query);
    }
    return queries;
}

/**
 * Recursively iterates over properties of the classes in the provided structure model and creates data for multiple SPARQL queries.
 * @param prefixes Common prefixes of the created queries
 * @param wherePattern Common where pattern in queries
 * @param selects Each select is specific for its corresponding query
 * @param currentClass Parameter of recursion and container of properties
 * @param varGen Generator for query variables
 * @param urlGen Generator for table URLs
 * @returns Variable representing the created subtree
 */
function buildQueriesRecursive(
    prefixes: Record<string, string>,
    wherePattern: SparqlPattern,
    selects: string[][],
    currentClass: StructureModelClass,
    varGen: VariableGenerator,
    urlGen: TableUrlGenerator
) : SparqlVariableNode {
    const currentSelect: string[] = [];
    selects.push(currentSelect);
    const tableUrlCom = makeTableUrlComment(urlGen);
    const subject = varGen.getNext();
    currentSelect.push(makeAs(subject.variableName, idColumnTitle));
    wherePattern.elements.push(makeTypeTriple(prefixes, subject, currentClass.cimIri));

    for (const property of currentClass.properties) {
        const dataType = property.dataTypes[0];
        const multipleValues = property.cardinalityMax === null || property.cardinalityMax > 1;
        const requiredValue = property.cardinalityMin > 0;
        if (dataType.isAssociation()) {
            const associatedClass = dataType.dataType;
            if (associatedClass.properties.length === 0) {
                const object = varGen.getNext();
                wherePattern.elements.push(propertyToElement(prefixes, subject, property.cimIri, object, requiredValue, property.isReverse));
                if (multipleValues) selects.push([ makeAs(subject.variableName, refColumnTitle), makeAs(object.variableName, property.technicalLabel), makeTableUrlComment(urlGen) ]);
                else currentSelect.push(makeAs(object.variableName, property.technicalLabel));
            }
            else {
                let targetPattern = wherePattern;
                if (!requiredValue) {
                    const opt = prepareOptional();
                    targetPattern = opt.optionalPattern;
                    wherePattern.elements.push(opt);
                }
                const propSubject = buildQueriesRecursive(prefixes, targetPattern, selects, associatedClass, varGen, urlGen);
                targetPattern.elements.push(propertyToElement(prefixes, subject, property.cimIri, propSubject, true, property.isReverse));
                if (multipleValues) selects.push([ makeAs(subject.variableName, leftRefColTitle), makeAs(propSubject.variableName, rightRefColTitle), makeTableUrlComment(urlGen) ]);
                else currentSelect.push(makeAs(propSubject.variableName, property.technicalLabel));
            }
        }
        else if (dataType.isAttribute()) {
            const object = varGen.getNext();
            wherePattern.elements.push(propertyToElement(prefixes, subject, property.cimIri, object, requiredValue));
            if (multipleValues) selects.push([ makeAs(subject.variableName, refColumnTitle), makeAs(object.variableName, property.technicalLabel), makeTableUrlComment(urlGen) ]);
            else currentSelect.push(makeAs(object.variableName, property.technicalLabel));
        }
        else assertFailed("Unexpected datatype!");
    }

    currentSelect.push(tableUrlCom);
    return subject;
}

/**
 * Creates rdf:type triple.
 * @param prefixes Necessary prefix may be created and added here.
 * @param subject Subject of the triple
 * @param typeIri Object of the triple
 * @returns Created rdf:type triple
 */
function makeTypeTriple(
    prefixes: Record<string, string>,
    subject: SparqlNode,
    typeIri: string
) : SparqlTriple {
    const typeTriple = new SparqlTriple();
    typeTriple.subject = subject;
    const typePredicate = new SparqlUriNode();
    typePredicate.uri = RDF_TYPE_URI;
    typeTriple.predicate = typePredicate;
    typeTriple.object = nodeFromIri(typeIri, prefixes);
    return typeTriple;
}

/**
 * Table URL is added to query as a comment to simplify orientation.
 */
function makeTableUrlComment(
    urlGen: TableUrlGenerator
) : string {
    return "# Table: " + urlGen.getNext().write();
}

/**
 * Creates SPARQL query element from property fields.
 * @param prefixes Prefixes of the new nodes are stored here.
 * @param subject Subject of the created triple
 * @param predIri IRI of the predicate
 * @param object Object of the created triple
 * @param required The triple is wrapped in optional pattern if this is false.
 * @param reverse Backwards associations have subject and object swapped.
 * @returns Created SPARQL element
 */
function propertyToElement(
    prefixes: Record<string, string>,
    subject: SparqlNode,
    predIri: string,
    object: SparqlNode,
    required: boolean,
    reverse: boolean = false
) : SparqlElement {
    const triple = new SparqlTriple();
    if (reverse) {
        triple.subject = object;
        triple.object = subject;
    }
    else {
        triple.subject = subject;
        triple.object = object;
    }
    triple.predicate = nodeFromIri(predIri, prefixes);
    if (required) return triple;
    else return wrapInOptional(triple);
}

/**
 * Creates AS pattern for select part of SPARQL query.
 * @param varName Original variable name
 * @param alias New name of for the variable
 */
function makeAs(
    varName: string,
    alias: string
) : string {
    return "(?" + varName + " AS ?" + alias + ")";
}

/**
 * Creates SPARQL query for single table CSV schema.
 * @param model Structure model of the CSV schema and the SPARQL query
 */
export function buildSingleTableQuery(
    model: StructureModel
) : SparqlSelectQuery {
    const query = new SparqlSelectQuery();
    query.prefixes = {};
    query.select = [];
    query.where = new SparqlPattern();
    query.where.elements = [];
    const varGen = new VariableGenerator();
    buildSingleQueryRecursive(query.prefixes, query.select, query.where, model.roots[0].classes[0], varGen, "");
    return query;
}

/**
 * Recursively iterates over properties of the classes in the provided structure model and creates data for SPARQL query.
 * @param prefixes Prefixes of the created query
 * @param select Select of the created query
 * @param where Where of the created query
 * @param currentClass Parameter of recursion and container of properties
 * @param varGen Generator for query variables
 * @param namePrefix Recursively created prefix of the names of the properties
 * @returns Variable representing the created subtree
 */
function buildSingleQueryRecursive(
    prefixes: Record<string, string>,
    select: string[],
    where: SparqlPattern,
    currentClass: StructureModelClass,
    varGen: VariableGenerator,
    namePrefix: string
) : SparqlVariableNode {
    const subject = varGen.getNext();
    where.elements.push(makeTypeTriple(prefixes, subject, currentClass.cimIri));

    for (const property of currentClass.properties) {
        const dataType = property.dataTypes[0];
        const requiredValue = property.cardinalityMin > 0;
        if (dataType.isAssociation()) {
            const associatedClass = dataType.dataType;
            if (associatedClass.properties.length === 0) {
                const object = varGen.getNext();
                where.elements.push(propertyToElement(prefixes, subject, property.cimIri, object, requiredValue, property.isReverse));
                select.push(makeAs(object.variableName, namePrefix + property.technicalLabel));
            }
            else {
                let targetPattern = where;
                if (!requiredValue) {
                    const opt = prepareOptional();
                    targetPattern = opt.optionalPattern;
                    where.elements.push(opt);
                }
                const propSubject = buildSingleQueryRecursive(prefixes, select, targetPattern, associatedClass, varGen, namePrefix + property.technicalLabel + nameSeparator);
                targetPattern.elements.push(propertyToElement(prefixes, subject, property.cimIri, propSubject, true, property.isReverse));
            }
        }
        else if (dataType.isAttribute()) {
            const object = varGen.getNext();
            where.elements.push(propertyToElement(prefixes, subject, property.cimIri, object, requiredValue));
            select.push(makeAs(object.variableName, namePrefix + property.technicalLabel));
        }
        else assertFailed("Unexpected datatype!");
    }

    return subject;
}

/**
 * Initializes fields of the SPARQL optional pattern.
 */
function prepareOptional() : SparqlOptionalPattern {
    const opt = new SparqlOptionalPattern();
    opt.optionalPattern = new SparqlPattern();
    opt.optionalPattern.elements = [];
    return opt;
}

/**
 * Puts SPARQL element inside a new optional pattern.
 */
function wrapInOptional(
    element: SparqlElement
) : SparqlOptionalPattern {
    const opt = prepareOptional();
    opt.optionalPattern.elements.push(element);
    return opt;
}

/**
 * Creates an RDF triple node from an IRI and adds a necessary prefix to query.
 */
function nodeFromIri(
    iriString: string,
    queryPrefixes: Record<string, string>
) : SparqlQNameNode {
    const separatedIri = splitIri(iriString);
    const prefix = addPrefix(separatedIri.namespace, queryPrefixes);
    const node = new SparqlQNameNode();
    node.qname = [prefix, separatedIri.local];
    return node;
}

/**
 * Splits full absolute IRI into a namespace and a local part.
 */
export function splitIri(
    fullIri: string
) : { namespace: string, local: string} {
    let lastBreak = 0;
    for (let i = 0; i < fullIri.length; i++) {
        if (fullIri[i] === "/" || fullIri[i] === "#") lastBreak = i;
    }
    return { namespace: fullIri.slice(0, lastBreak + 1), local: fullIri.slice(lastBreak + 1) }
}

/**
 * Creates a prefix from a namespace IRI, adds the namespace into a query and returns the prefix.
 */
export function addPrefix(
    namespaceIri: string,
    queryPrefixes: Record<string, string>
) : string {
    // Check if the namespace is already present.
    for (const ns in queryPrefixes) {
        if (queryPrefixes[ns] === namespaceIri) return ns;
    }

    // Check if the namespace is well-known.
    for (const key in csvwContext["@context"]) {
        if (csvwContext["@context"][key] === namespaceIri) {
            queryPrefixes[key] = namespaceIri;
            return key;
        }
    }

    // Find max number of generic prefix.
    const genericPrefix = "ns";
    let max = 0;
    for (const ns in queryPrefixes) {
        if (ns.slice(0, genericPrefix.length) === genericPrefix) {
            let nsNumber = parseInt(ns.slice(genericPrefix.length));
            if (nsNumber > max) max = nsNumber;
        }
    }
    const newPrefix = genericPrefix + (max + 1).toString();
    queryPrefixes[newPrefix] = namespaceIri;
    return newPrefix;
}
