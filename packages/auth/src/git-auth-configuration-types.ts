export type GitBotConfiguration = {
  /**
   * The user name for the bot, which will be used for commiting if user does not provide credentials or does not have credentials with sufficient rights
   */
  dsBotUserName: string;
  /**
   * The email address of the bot.
   */
  dsBotEmail: string;
  /**
   * Git provider token which can be used for cloning/committing (possibly even removing)
   */
  dsBotAbsoluteGitProviderControlToken: string;
  /**
   * Id to store the ssh config of bot under.
   */
  dsBotSSHId?: string;
  /**
   * Is the private ssh key of the bot to use.
   */
  dsBotSSHPrivateKey?: string;
}

export type OAuthConfiguration = {
  /**
   * Is any random string, it will be used as a secret for authJS
   */
  authSecret: string,
  /**
   * is the Id of the OAuth app, you can find it after creating OAuth app in GitHub settings
   */
  gitHubAuthClientId: string,
  /**
   * Same as id
   */
  gitHubAuthClientSecret: string,
}
