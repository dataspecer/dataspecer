export default {
    // Server's public URL. Must not end with a slash
    host: "http://localhost:3100",
    // Local port to listen on
    port: 3100,
    // Max payload limit for stores PUSH operation
    payloadSizeLimit: "64mb",

    // Generator configuraion
    configuration: {
        // Instance defaults for documentation. Unspecified partials keep their
        // built-in values; project overrides take precedence. Restart the backend
        // after changing this configuration.
        documentation: {
            partials: {
                // Replaces the whole html-head partial. Copy its built-in value
                // from packages/documentation/src/default-configuration.ts to
                // preserve the standard scripts and styles when customizing it.
                // "html-head": `<meta charset="utf-8" /><title>My documentation</title>`,
                // Use false to remove a partial, or an empty string to render nothing.
            },
        },

        json: {
            /**
             * Key of property representing ID of the entity.
             * If set to null, the property won't be used.
             */
            //jsonIdKeyAlias: "id",

            /**
             * Key of property representing the type of the entity.
             * If set to null, the property won't be used.
             */
            //jsonTypeKeyAlias: "type",

            /**
             * In JSON-LD, you can map types to any string. This decides what it shall be.
             */
            //jsonTypeKeyMappingType: "json_type_key_mapping_type_label",

            /**
             * Language used for label if {jsonTypeKeyMappingType === "json_type_key_mapping_type_label"}
             */
            //jsonTypeKeyMappingTypeLabel: "cs",
        },

        xml: {
            //rootClass: {
            //    extractType: false,
            //    extractGroup: false,
            //},

            //otherClasses: {
            //    extractType: false,
            //    extractGroup: false,
            //},
        },

        csv: {
            //enableMultipleTableSchema: false,
        }
    }
}
