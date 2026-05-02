import { LanguageString } from "@dataspecer/core/core";
import { Literal, OTerm, Quad, Quad_Object, Store } from "n3";

/**
 * Creates LanguageString from array of literals. Other objects will be ignored.
 * If no language is provided, it will be stored under "_".
 */
export function objectsToLanguageString(objects: Quad_Object[]): LanguageString {
    const result: LanguageString = {};
    for (const object of objects) {
        if (object.termType === "Literal") {
            const literal = object as Literal;
            result[object.language ?? "_"] = object.value;
        }
    }
    return result;
}

/**
 * Similar to getQuads, but allows to pass multiple subjects, predicates and objects.
 */
export function getQuadsByMany(store: Store, subject: OTerm | OTerm[], predicate: OTerm | OTerm[], object: OTerm | OTerm[], graph: OTerm = null): Quad[] {
    subject = Array.isArray(subject) ? subject : [subject];
    predicate = Array.isArray(predicate) ? predicate : [predicate];
    object = Array.isArray(object) ? object : [object];

    const results = [];
    for (const s of subject) {
        for (const p of predicate) {
            for (const o of object) {
                results.push(...store.getQuads(s, p, o, graph));
            }
        }
    }

    return results;
}