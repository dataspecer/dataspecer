import { isRdfDataType, isXsdSimpleDataType, isGeoSPARQLDataType } from "@dataspecer/core-v2/semantic-model/datatypes";

export const dataTypeUriToName = (uri: string) => {
  if (isXsdSimpleDataType(uri)) {
    return "xsd:" + uri.split("#").at(1)!;
  }
  if (isRdfDataType(uri)) {
    return "rdf:" + uri.split("#").at(1)!;
  }
  if (isGeoSPARQLDataType(uri)) {
    return "gsp:" + uri.split("#").at(1)!;
  }
  if (uri.startsWith("http://www.opengis.net/ont/sf#")) {
    return "sf:" + uri.split("#").at(1)!;
  }
  if (uri === "http://www.w3.org/2000/01/rdf-schema#Literal") {
    return "rdfs:Literal";
  }
  if (uri === "https://ofn.gov.cz/zdroj/základní-datové-typy/2020-07-01/text") {
    // https://github.com/dataspecer/dataspecer/issues/1078
    return "Text";
  }
  return null;
};
