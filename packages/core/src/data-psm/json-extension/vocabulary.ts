import {EXTENSION_OPERATION, PSM_EXTENSIONS} from "../data-psm-vocabulary.ts";

export const JSON_EXTENSION = PSM_EXTENSIONS + "json" as `${typeof PSM_EXTENSIONS}json`; // as const

//

const base = EXTENSION_OPERATION + "json/operations/";

export const SET_USE_KEY_VALUE_FOR_LANG_STRING = base + "set-use-key-value-for-lang-string";
