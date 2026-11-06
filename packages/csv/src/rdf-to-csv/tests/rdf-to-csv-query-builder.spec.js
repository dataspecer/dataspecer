import {
    addPrefix,
    splitIri
} from "../rdf-to-csv-query-builder";

const testNamePrefix = "RDF to CSV: ";

test(testNamePrefix + "split IRI namespace slash", async () => {
    const split = splitIri("https://slovník.gov.cz/datový/číselníky/pojem/alternativní-název-položky-číselníku");
    expect(split.namespace).toBe("https://slovník.gov.cz/datový/číselníky/pojem/");
});

test(testNamePrefix + "split IRI local slash", async () => {
    const split = splitIri("https://slovník.gov.cz/datový/číselníky/pojem/alternativní-název-položky-číselníku");
    expect(split.local).toBe("alternativní-název-položky-číselníku");
});

test(testNamePrefix + "split IRI namespace sharp", async () => {
    const split = splitIri("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    expect(split.namespace).toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
});

test(testNamePrefix + "split IRI local sharp", async () => {
    const split = splitIri("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    expect(split.local).toBe("type");
});

test(testNamePrefix + "add prefix", async () => {
    const prefixes = {};
    const newPrefix = addPrefix("https://slovník.gov.cz/datový/číselníky/pojem/", prefixes);
    expect(newPrefix).toBe("ns1");
});

test(testNamePrefix + "add prefixes", async () => {
    const prefixes = {};
    addPrefix("https://slovník.gov.cz/datový/číselníky/dojem/", prefixes);
    addPrefix("https://slovník.gov.cz/datový/číselníky/hnojem/", prefixes);
    const newPrefix = addPrefix("https://slovník.gov.cz/datový/číselníky/pojem/", prefixes);
    expect(newPrefix).toBe("ns3");
});

test(testNamePrefix + "add same prefixes", async () => {
    const prefixes = {};
    addPrefix("https://slovník.gov.cz/datový/číselníky/dojem/", prefixes);
    addPrefix("https://slovník.gov.cz/datový/číselníky/pojem/", prefixes);
    const newPrefix = addPrefix("https://slovník.gov.cz/datový/číselníky/dojem/", prefixes);
    expect(newPrefix).toBe("ns1");
});

test(testNamePrefix + "add well-known prefix", async () => {
    const prefixes = {};
    const newPrefix = addPrefix("http://www.w3.org/1999/02/22-rdf-syntax-ns#", prefixes);
    expect(newPrefix).toBe("rdf");
});

test(testNamePrefix + "add well-known prefixes", async () => {
    const prefixes = {};
    addPrefix("http://www.w3.org/1999/02/22-rdf-syntax-ns#", prefixes);
    const newPrefix = addPrefix("http://purl.org/dc/terms/", prefixes);
    expect(newPrefix).toBe("dc");
});

test(testNamePrefix + "check if well-known prefix saved", async () => {
    const prefixes = {};
    addPrefix("http://www.w3.org/1999/02/22-rdf-syntax-ns#", prefixes);
    expect(prefixes["rdf"]).toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
});
