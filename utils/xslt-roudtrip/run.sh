#!/bin/bash

npx xslt3-he -xsl:03-lifting.xslt -s:01-data.xml -o:04-rdf.xml -t
node ./xml2ttl.mjs 04-rdf.xml > 05-rdf.ttl
node ./ttl2sparql-result.mjs 05-rdf.ttl > 06-rdf-sparql.xml
npx xslt3-he -xsl:07-lowering.xslt -s:06-rdf-sparql.xml -o:08-transformed.xml -t

echo done.