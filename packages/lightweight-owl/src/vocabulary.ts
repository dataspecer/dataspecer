/**
 * This file contains internal vocabulary for use in data-specification-vocabulary
 * package. The vocabulary is provided as 'n3' package IRI so they can be
 * easily used with 'n3'.
 */
import { DataFactory } from "n3";

const IRI = DataFactory.namedNode;

const PROF_PREFIX = "http://www.w3.org/ns/dx/prof/";

export const PROF = {
  "Profile": IRI(PROF_PREFIX + "Profile"),
  "isProfileOf": IRI(PROF_PREFIX + "isProfileOf"),
};