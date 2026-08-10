import {EXTENSION_OPERATION, PSM_EXTENSIONS} from "../data-psm-vocabulary.ts";

export const XML_EXTENSION = PSM_EXTENSIONS + "xml" as `${typeof PSM_EXTENSIONS}xml`; // as const

//

const base = EXTENSION_OPERATION + "xml/operations/";

export const SET_IS_XML_ATTRIBUTE = base + "set-is-xml-attribute";

export const SET_GML_TYPE = base + "set-gml-type";

export const SET_NAMESPACE = base + "set-namespace";

export const SET_SKIP_ROOT_ELEMENT = base + "set-skip-root-element";
