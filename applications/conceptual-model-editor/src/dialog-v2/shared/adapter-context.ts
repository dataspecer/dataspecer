import { DialogSemanticTracker } from "../dialog-semantic-tracker";

export interface AdapterContext {

  tracker: DialogSemanticTracker;

  languages: string[];

}
