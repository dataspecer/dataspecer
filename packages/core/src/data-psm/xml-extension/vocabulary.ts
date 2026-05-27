import {PSM_EXTENSIONS} from "../data-psm-vocabulary.ts";

export const XML_EXTENSION = PSM_EXTENSIONS + "xml" as `${typeof PSM_EXTENSIONS}xml`; // as const

//

const base = XML_EXTENSION + "/";

export const SET_IS_XML_ATTRIBUTE = base + "setIsXmlAttribute";

export const SET_GML_TYPE = base + "setGmlType";

export const SET_NAMESPACE = base + "setNamespace";

export const SET_SKIP_ROOT_ELEMENT = base + "setSkipRootElement";
