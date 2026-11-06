import { join, dirname, resolve } from 'path';
import { existsSync, readdirSync, lstatSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

function fromDir(startPath, filter, found) {
  if (!existsSync(startPath)) {
      return;
  }

  var files = readdirSync(startPath);
  for (var i = 0; i < files.length; i++) {
      var filename = join(startPath, files[i]);
      var stat = lstatSync(filename);
      if (stat.isDirectory()) {
          fromDir(filename, filter, found); //recurse
      } else if (filename.endsWith(filter)) {
          found.push(filename);
      };
  };
};

/**
 * Compiles all .sparql file from source directory to output directory
 */
export function compileDir(srcDirectory, outputDirectory) {
  const found = [];
  fromDir(srcDirectory, '.sparql', found);
  for (const file of found) {
    const rawData = readFileSync(file);
    const transformed = processSparqlFile(rawData.toString());
    const newFile = outputDirectory + file.substring('src'.length) + '.js';
    mkdirSync(dirname(newFile), {recursive: true});
    writeFileSync(newFile, transformed);
  }
}

function processSparql(input) {
  const minified = input.replace(/^\s*#.*$/gm, "").replace(/\s+/g, " ");
  const parts = minified.split(/%[A-Z_]+%/).map((part) => JSON.stringify(part));
  const variables = [...minified.matchAll(/%([A-Z_]+)%/g)].map(([, variable]) => variable.toLowerCase().replace(/_+(.)/g, (_, chr) => chr.toUpperCase())).map((key) => `p.${key}`);

  // zip the arrays
  const zipped = parts.flatMap((part, i) => [part, variables[i] ?? ""]);

  return zipped.filter((p) => p.length > 0).join(" +\n\t");
}

export function vitestSparqlPlugin() {
  return {
    name: "vitest-sparql-plugin",
    resolveId(source, importer) {
      if (importer && source.endsWith(".sparql.ts")) {
        return resolve(dirname(importer), source.slice(0, -3));
      }
    },
    transform(src, id) {
      if (id.endsWith(".sparql")) {
        return processSparqlFile(src);
      }
    },
  };
}

function processSparqlFile(content) {
  return `export default p => ${processSparql(content)};\n`;
}
