#!/usr/bin/env node

import rdflib from "rdflib";
import { readFileSync } from "node:fs";

const inputFile = process.argv[2];

if (!inputFile) {
	console.error("Usage: node xml2ttl.mjs <input-rdf-xml-file>");
	process.exit(1);
}

const data = readFileSync(inputFile, "utf8");
const store = rdflib.graph();
rdflib.parse(data, store, "http://todo-base/", "application/rdf+xml");

console.log(rdflib.serialize(null, store, "http://todo-base/", "text/turtle"));
