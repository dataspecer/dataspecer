#!/usr/bin/env node

import rdflib from "rdflib";
import { readFileSync } from "node:fs";

const inputFile = process.argv[2];

if (!inputFile) {
  console.error("Usage: node ttl2sparql-result.mjs <input-ttl-file>");
  process.exit(1);
}

const data = readFileSync(inputFile, "utf8");
const store = rdflib.graph();
rdflib.parse(data, store, "http://base/", "text/turtle");

const escapeXmlText = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const escapeXmlAttribute = (value) => escapeXmlText(value).replaceAll('"', "&quot;").replaceAll("'", "&apos;");

const termToSparqlXml = (term) => {
  if (term.termType === "Literal") {
    const langAttribute = term.lang ? ` xml:lang="${escapeXmlAttribute(term.lang)}"` : "";
    return `<literal${langAttribute}>${escapeXmlText(term.value)}</literal>`;
  }

  if (term.termType === "BlankNode") {
    return `<bnode>${escapeXmlText(term.value)}</bnode>`;
  }

  return `<uri>${escapeXmlText(term.value)}</uri>`;
};

// Print output

console.log(`<sparql xmlns="http://www.w3.org/2005/sparql-results#" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.w3.org/2005/sparql-results# http://www.w3.org/2001/sw/DataAccess/rf1/result2.xsd">
  <head>
   <variable name="slovnik"/>
   <variable name="nazev_slovniku"/>
  </head>
  <results>`);

store.statementsMatching(null, null, null).forEach((item) => {
  const objectValue = termToSparqlXml(item.object);
  const subjectValue = termToSparqlXml(item.subject);
  const predicateValue = termToSparqlXml(item.predicate);

  console.log(
    `    <result>
      <binding name="s">
        ${subjectValue}
      </binding>
      <binding name="p">
        ${predicateValue}
      </binding>
      <binding name="o">
        ` +
      objectValue +
      `
      </binding>
    </result>`,
  );
});

console.log(`  </results>
</sparql>`);
