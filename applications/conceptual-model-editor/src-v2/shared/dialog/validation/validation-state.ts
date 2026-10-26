
export interface ValidationState {

  messages: {

    type: "error" | "warning";

    /**
     * Message template.
     */
    message: string;

    arguments: (string | number)[];

  }[];

}
