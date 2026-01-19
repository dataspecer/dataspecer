export default ({
    // Server's public URL. Must not end with a slash
    host: "http://localhost:3100",
    // Local port to listen on
    port: 3100,
    // Max payload limit for stores PUSH operation
    payloadSizeLimit: "64mb",

    // Important note: Either provide all the required fields in the authConfigration (and same for gitConfiguration) or do not provide the configuration at all,
    //                 otherwise server crashes on certain requests
    // authConfiguration: {
    //     /**
    //      * Is any random string, it will be used as a secret for authJS
    //      */
    //     // authSecret: "Change me to random string",

    //     /**
    //      * is the Id of the OAuth app, you can find it after creating OAuth app in GitHub settings
    //      */
    //     // gitHubAuthClientId: "xxxxxxx",

    //     /**
    //      * Same as id
    //      */
    //     // gitHubAuthClientSecret: "xxxxxxxxxxxxxxxxxxxxxxxxxxx",
    // },

    // gitConfiguration: {
    //     /**
    //      * The user name for the bot, which will be used for commiting if user does not provide credentials or does not have credentials with sufficient rights
    //      */
    //     // dsBotUserName: "ds-bot",

    //     /**
    //      * The email address of the bot.
    //      */
    //     // dsBotEmail: "dsBot@gmail.com",

    //     /**
    //      * Token which can be used for cloning/commiting (possibly even removing)
    //      */
    //     // dsBotAbsoluteGitProviderControlToken: "ghp_xxxxxxxxxxxxxxxxxxxx",

    //     /**
    //      * Id to store the ssh config of bot under.
    //      */
    //     // dsBotSSHId: "ds-bot-id",

    //     /**
    //      * Is the private ssh key of the bot to use.
    //      */
    //     // dsBotSSHPrivateKey: "XXXXXXXxxxxxxx"
    // },

    /**
     * TODO RadStr: For local development. It will probably not be needed once we are in production. In production we will just use the basename/api
     *              Can be undefined. If it is undefined then uses the basename/api
     *              Must not end with slash
     */
    gitWebhookBaseUrl: undefined,

    // Generator configuraion
    configuration: {
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
    },
});
