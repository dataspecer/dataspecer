import {
    StructureModelClass,
    StructureModelComplexType,
    StructureModelProperty
  } from "@dataspecer/generators/structure-model/model";

/**
 * Tells whether the start class has unique cimIRI that does not occur anywhere else in the tree structure.
 * @param cls Class to start the search from.
 * @param rootClass cimIRI to check uniqueness against too
 * @returns True if the cimIRI of the supplied class is unique in the whole data structure and is not the same as rootClass cimIRI.
 */
export function anyPredicateHasUniqueType(cls : StructureModelClass , rootClass : string): boolean{
    var uniqueCim = false;
    for (const [i, prop] of cls.properties.entries()) {
        for (var dt of prop.dataTypes) {
            if(dt.isAssociation() == true){
                const dtcasted = <StructureModelComplexType> dt;
                if(isUniqueRecursive(dtcasted.dataType, dtcasted.dataType.cimIri, true) && dtcasted.dataType.instancesSpecifyTypes === "ALWAYS" && !(rootClass ===  dtcasted.dataType.cimIri) ){
                    uniqueCim = true;
                }
            }
        }
    }
    return uniqueCim;
}

/**
 * Returns whether any predicate going from the supplied class has a unique predicate cimIRI.
 * @param cls Class to start the search from.
 * @returns True if any predicate going from the supplied class has a unique predicate cimIRI.
 */
export function anyPredicateHasUniquePredicates(cls : StructureModelClass ): boolean{
    var uniqueCim = false;

    var propertiesIris = [];
    for (const [i, prop] of cls.properties.entries()) {
        propertiesIris.push(prop.cimIri);
    }
    for (const [i, prop] of cls.properties.entries()) {
        for (var dt of prop.dataTypes) {
            if(dt.isAssociation() == true){
                const dtcasted = <StructureModelComplexType> dt;
                if(hasUniquePredicatesFromSecondLevel(dtcasted.dataType, propertiesIris) == true ){
                    return true;
                }
            }
        }
    }

    return uniqueCim;
}

/**
 * Gets unique class whose cim does not occur anywhere else in the tree structure.
 * @param cls Class to start the search from.
 * @param rootClass cimIRI of root class to check the uniqueness of the predicates clas types.
 * @returns StructureModelClass that has unique cimIRI in the whole data structure.
 */
export function getAnyPredicateUniqueType(cls: StructureModelClass, rootClass : string): StructureModelClass {
    var uniqueClass = null;

    for (const [i, prop] of cls.properties.entries()) {
        for (var dt of prop.dataTypes) {
            if(dt.isAssociation() == true){
            const dtcasted = <StructureModelComplexType> dt;
                if(isUniqueClass(dtcasted.dataType) && dtcasted.dataType.instancesSpecifyTypes == "ALWAYS" && !(dtcasted.dataType.cimIri === rootClass)){
                    return dtcasted.dataType;
                }
            }
        }
    }

    return uniqueClass;
}

/**
 * Returns object containing data about unique predicate going onwards from supplied Classes predicates.
 * @param cls Class to start the search from.
 * @returns Object containing key:cimIRI of unique predicate and value:PropertyClass that is unique.
 */
export function getAnyPredicateUniquePredicate(cls: StructureModelClass): { [key: string]: any} {
    var uniqueProperty = null;

    var propertiesIris = [];
    for (const [i, prop] of cls.properties.entries()) {
        propertiesIris.push(prop.cimIri);
    }

    for (const [i, prop] of cls.properties.entries()) {
        for (var dt of prop.dataTypes) {
            if(dt.isAssociation() == true){
                const dtcasted = <StructureModelComplexType> dt;
                for (const [i, propInside] of dtcasted.dataType.properties.entries()) {
                    for (var dtInside of propInside.dataTypes) {
                        //if(dtInside.isAssociation() == true){
                            if(hasUniquePredicatesProperty(propInside, propInside.cimIri, true) && propInside.cardinalityMin > 0 && !(propertiesIris.includes(propInside.cimIri))){
                                return { uniquepropclass: dtcasted.dataType, predicate: propInside};
                            }
                        //}
                    }
                }
            }
        }
    }
    return uniqueProperty;
}

/**
 * Gets unique predicate that have cim that does not occur anywhere else in the tree structure from StructureModelClass.
 * @param cls Class to start the search from.
 * @returns Cim of unique predicate tied to supplied StructureModelClass.
 */
export function getUniquePredicate(cls : StructureModelClass ): String{
    var uniqueCim = "";
    for (const [i, prop] of cls.properties.entries()) {
        if(hasUniquePredicatesSearchInClass(cls, prop.cimIri) && prop.cardinalityMin > 0){
            uniqueCim = prop.cimIri;

            break;
        }
    }
    return uniqueCim;

}

/**
 * Checks whether supplied StructureModelClass has predicates that have cim that does not occur anywhere else in the tree structure.
 * @param cls Class to start the search from.
 * @returns True if the class has any predicate that has unique cimIRI in the whole data structure.
 */
export function hasUniquePredicates(cls : StructureModelClass ): Boolean{
    var hasUnique = false;
    for (const [i, prop] of cls.properties.entries()) {
        if(hasUniquePredicatesSearchInClass(cls, prop.cimIri) && prop.cardinalityMin > 0){
            return true;
        }
    }

    return hasUnique;

}

/**
 * Returns whether the cimIRI of any of the properties is unique in the data structure.
 * @param cls Class to start the search from.
 * @param predicates cimIRIs of the predicates on the level above.
 * @returns True if the cimIRI of any of the properties is unique in the data structure.
 */
function hasUniquePredicatesFromSecondLevel(cls : StructureModelClass, predicates : String[] ): Boolean{
    var hasUnique = false;
    for (const [i, prop] of cls.properties.entries()) {
        if(hasUniquePredicatesSearchInClass(cls, prop.cimIri) && prop.cardinalityMin > 0 && !(predicates.includes(prop.cimIri))){
            return true;
        }
    }

    return hasUnique;

}

/**
 * Returns whether the predicates cimIRIs are different on the same level inside one class
 * @param cls Class to start the search from.
 * @param cimIri cimIRI that needs to be different for the function to succeed.
 * @returns True if the predicates cimIRIs are different on the same level inside one class.
 */
function hasUniquePredicatesSearchInClass(cls : StructureModelClass , cimIri : string): boolean{
    var hasUnique = true;

    for (const [i, prop] of cls.properties.entries()) {
        if(prop.cimIri === cimIri){
            if(hasUniquePredicatesProperty(prop, cimIri, true) == false){
                hasUnique = false;
            }
        } else {
            if(hasUniquePredicatesProperty(prop, cimIri, false) == false){
                hasUnique = false;
            }
        }
    }
    return hasUnique;
}

/**
 * Returns whether the supplied property and its children are different from the supplied cimIRI.
 * @param prop Property that is being tested for having the same cimIRI.
 * @param cimIri IRI that must not occur anywhere else in other properties cimIRIs.
 * @param firstOccurrence Whether the property we are searching is the same as the starting one.
 * @returns True if the property's cimIri is unique in the data structure going downwards. False otherwise.
 */
function hasUniquePredicatesProperty(prop: StructureModelProperty, cimIri : String, firstOccurrence : boolean): boolean {
    if(!firstOccurrence && (prop.cimIri === cimIri)){
        return false;
    } else if(firstOccurrence && (prop.cimIri === cimIri)) {
        firstOccurrence = false;
    }
        // The cimIri of this class is not the same, check other classes, for each property check associations
        for (var dt of prop.dataTypes) {
            if(dt.isAssociation() == true){
                const dtcasted = <StructureModelComplexType> dt;
                for (const [i, propInside] of dtcasted.dataType.properties.entries()) {
                    if(hasUniquePredicatesProperty(propInside, cimIri, firstOccurrence) == false){
                        return false;
                    }
                }
            }
        }
        return true;
}

/**
 * Returns whether the supplied class has unique cimIRI among the whole data structure going from it.
 * @param cls Class to start the search from that is checked whether it has unique cim.
 * @returns True if the class' cimIri is unique in the whole data structure. False otherwise.
 */
export function isUniqueClass(cls : StructureModelClass ): Boolean{

    return isUniqueRecursive(cls, cls.cimIri, true);

}

/**
 * Returns whether the supplied class and its children are different from the supplied cimIRI.
 * @param cls Class that is being tested for having the same cimIRI.
 * @param cimIri IRI that must not occur anywhere else in other classes.
 * @param firstClass Whether the class we are searching is the same as the starting one.
 * @returns True if the class' cimIri is unique in the data structure going downwards. False otherwise.
 */
function isUniqueRecursive(cls: StructureModelClass, cimIri : String, firstClass : boolean): boolean{
    if(!firstClass && (cls.cimIri === cimIri)){
        return false;
    } else{
        // The cimIri of this class is not the same, check other classes, for each property check associations
        for (const [i, prop] of cls.properties.entries()) {
            for (var dt of prop.dataTypes) {
                if(dt.isAssociation() == true){
                    const dtcasted = <StructureModelComplexType> dt;

                    if(isUniqueRecursive(dtcasted.dataType, cimIri, false) == false){
                        return false;
                    }
                }
            }
        }
        return true;
    }
}

/**
 * Takes a record of prefixes and adds them to the beginning of the data string.
 * @param recordOfDataAndPrefixes Record containing data string at the first position and record of prefixes that need to be put at the beginning of the string in the second part of the record.
 * @returns String of data with prefixes at the beginning
 */
export async function prependPrefixes(recordOfDataAndPrefixes : Record<string, Record<string, string>>): Promise<string>{
    var data = "";
    var prefixes = {};
    var prefixesString = "";

    for(var key in recordOfDataAndPrefixes){
        data = key;
        prefixes = recordOfDataAndPrefixes[key];
    }
    for(var key in prefixes ){
        prefixesString = prefixesString.concat("prefix " + key + ": <" + prefixes[key] + ">\n");
    }
    prefixesString = prefixesString.concat("\n");

    return prefixesString + data;
}

/**
 * Searches for known prefixes in the data string, prefixifies the IRIs containing well-known prefixes.
 * @param data Data string that needs to be prefixified and get prefixes declarations at its beginning.
 * @returns Record of modified string and prefixes found in the text.
 */
export function prefixifyFinalOutput(data : string): Record<string, Record<string, string>>{
    var prefixifiedString = data;

    var prefixes = recognizeStandardPrefixes(data);

    prefixifiedString = prefixifyString(data, prefixes);

    const result: Record<string,Record<string, string>> = {};
    result[prefixifiedString] = prefixes;
    return result;
}

/**
 * Searches string for known prefixes and returns a record of found ones.
 * @param data String of data that needs to be prefixed.
 * @returns Record of prefix tags and prefix IRIs encountered in the data string from parameter.
 */
function recognizeStandardPrefixes(data : string): Record<string, string>{
    var prefixes :Record<string, string> = {};

    for(var key in usualPrefixes){
        if(data.search(usualPrefixes[key]) != -1){
            prefixes[key] = usualPrefixes[key];
        }
    }
    return prefixes;
}

/**
 * Modifies the string so that IRIs with specified prefixes are then represented in the prefix:rest form.
 * @param data Data string to be modified.
 * @param prefixes Record of prefix tags and prefix IRIs.
 * @returns Data string modified to the prefix:rest shape for IRIs containing specified prefixes.
 */
function prefixifyString(data : string, prefixes: Record<string, string>): string{
    var prefixifiedString = data;

    for(var key in prefixes){
        prefixifiedString = prefixifiedString.replaceAll(/<[^<>]+>/g,function(match,offset,param2) {
            var prefixified = "";
            if(match.search(prefixes[key]) != -1){
                prefixes[key].length
                prefixified = key + ":" + match.substring((prefixes[key].length)+1, (match.length)-1);
            } else {
                prefixified = match;
            }
            return prefixified;
            }
        );
    }
    return prefixifiedString;
}

/**
 * String will have base URL declaration in ShExC format added at the beginning of it.
 * @param file String of data in ShExC to be modified.
 * @param base Base URL to add at the beginning of the String of data.
 * @returns String with added base URL declaration.
 */
export async function fixTurtleFileWithBaseShex(file: String, base: String): Promise<String> {
    var fixedFile = file;

    const regex = /\n{2}/i;
    fixedFile = fixedFile.replace(regex, '\nbase <' + base + '>\n\n');
    return fixedFile;
}

/**
 * Deletes given parameter from the file and puts it at the beginning
 * @param file String That needs adjustments
 * @param wrongPosition Which prefix is in wrong position
 * @returns Alternated file with string that has been in wrong positions put into correct one
 */
export async function fixPrefixPosition(file: String, wrongPosition: String): Promise<String> {
    const firstReplacement = wrongPosition + "\n";
    var fixedFile = file;
    // delete the prefix from the middle of the file
    var updated = fixedFile.replaceAll(firstReplacement.toString(),'');

    // Add the prefix at the beginning of the file
    const regex = /@prefix/i;
    fixedFile = updated.replace(regex, wrongPosition + '\n@prefix');

    return fixedFile;
}

/**
 * Usual prefixes that can be seen in types/predicates
 */
const usualPrefixes: Record<string, string> = {
    ["rdf"]: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    ["dc"]: "http://purl.org/dc/elements/1.1/",
    ["foaf"]: "http://xmlns.com/foaf/0.1/",
    ["rdfs"]: "http://www.w3.org/2000/01/rdf-schema#",
    ["xsd"]: "http://www.w3.org/2001/XMLSchema#",
    ["owl"]: "http://www.w3.org/2002/07/owl#",
    ["vann"]: "http://purl.org/vocab/vann/",
    ["cc"]: "http://web.resource.org/cc/",
    ["vs"]: "http://www.w3.org/2003/06/sw-vocab-status/ns#",
    ["wot"]: "http://xmlns.com/wot/0.1/",
    ["geo"]: "http://www.w3.org/2003/01/geo/wgs84_pos#",
  };