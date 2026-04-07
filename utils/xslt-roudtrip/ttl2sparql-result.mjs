#!/usr/bin/env node

import rdflib from 'rdflib';
import { readFileSync } from "node:fs";

const inputFile = process.argv[2];

if (!inputFile) {
	console.error("Usage: node xml2ttl.mjs <input-rdf-xml-file>");
	process.exit(1);
}

const data = readFileSync(inputFile, "utf8");
const store = rdflib.graph();
rdflib.parse(data, store, 'http://base/', 'text/turtle');

console.log(`<sparql xmlns="http://www.w3.org/2005/sparql-results#" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.w3.org/2005/sparql-results# http://www.w3.org/2001/sw/DataAccess/rf1/result2.xsd">
  <head>
   <variable name="slovnik"/>
   <variable name="nazev_slovniku"/>
  </head>
  <results distinct="false" ordered="true">`);
store.statementsMatching(null, null, null).forEach(item => {
  const objectValue = item.object.termType === 'Literal'
    ? (() => {
        const langAttribute = item.object.lang ? ` xml:lang="${item.object.lang}"` : "";
        return `<literal${langAttribute}>${item.object.value}</literal>`;
      })()
    : `<uri>${item.object.value}</uri>`;

  console.log(`    <result>
      <binding name="s">
        <uri>${item.subject.value}</uri>
      </binding>
      <binding name="p">
        <uri>${item.predicate.value}</uri>
      </binding>
      <binding name="o">
        ` + objectValue + `
      </binding>
    </result>`);
});
console.log(`  </results>
</sparql>`);
