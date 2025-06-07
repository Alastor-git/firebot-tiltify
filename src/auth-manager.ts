import {
    AuthDetails,
    Integration,
    LinkData
} from "@crowbartools/firebot-custom-scripts-types";
import { tiltifyAPIController, tiltifyIntegration } from "@/services";

import { logger, integrationManager } from "@shared/firebot-modules";
import {
    TiltifyIntegrationEvents,
    TiltifySettings
} from "@/tiltify-integration";
import { AuthProviderDefinition } from "@crowbartools/firebot-custom-scripts-types/types/modules/auth-manager";

/**
 * Description placeholder
 *
 * @export
 * @class TiltifyAuthManager
 * @typedef {TiltifyAuthManager}
 */
export class TiltifyAuthManager {
    /**
     * Description placeholder
     *
     * @static
     * @async
     * @returns {Promise<boolean>}
     */
    static async isTokenValid(): Promise<boolean> {
        // Get the saved access token
        let token: AuthDetails | null = await TiltifyAuthManager.getAuth();
        if (token === null) {
            logger.debug("Tiltify : Couldn't retrieve a valid token. ");
            return false;
        }

        // Check whether the token is still valid.
        if ((await tiltifyAPIController().validateToken()) === true) {
            return true;
        }
        // Token wasn't valid, attempt to refresh it
        logger.debug("Tiltify : Token invalid. ");
        logger.debug("Tiltify : Attempting to refresh token. ");
        token = await TiltifyAuthManager.refreshToken();
        // The refreshing fails.
        if (token === null) {
            logger.debug("Tiltify : Refreshing token failed. ");
            return false;
        }
        return true;
    }

    /**
     * Description placeholder
     *
     * @static
     * @async
     * @returns {Promise<AuthDetails | null>}
     */
    static async getAuth(): Promise<AuthDetails | null> {
        // Checks if the IntegrationManager has a getAuth Method and uses it if true.
        let token: AuthDetails | null = null;
        if (
            "getAuth" in integrationManager &&
            typeof integrationManager.getAuth === "function"
        ) {
            const authData: LinkData = await integrationManager.getAuth(
                tiltifyIntegration().integrationId
            );
            if (authData === null) {
                logger.debug("Tiltify : Couldn't retrieve a valid token. ");
            } else {
                if ("auth" in authData === false) {
                    logger.warn("Tiltify : Invalid authentication data. ");
                    throw new Error("Tiltify: Invalid authentication data.");
                }
                token = authData.auth;
            }
        } else {
            const integrationId: string = tiltifyIntegration().integrationId;
            const integration: Integration = integrationManager.getIntegrationById(integrationId);
            const integrationDefinition =
                integrationManager.getIntegrationDefinitionById<TiltifySettings>(
                    integrationId
                );
            if (integration == null || !integrationDefinition.linked) {
                tiltifyIntegration().disconnect();
                return null;
            }

            let token: AuthDetails | null = null;
            if (integrationDefinition.linkType !== "auth") {
                return null;
            }
            const authProvider: AuthProviderDefinition = integrationDefinition.authProviderDetails;
            token = integrationDefinition.auth ? TiltifyAuthManager.getAuthDetails(integrationDefinition.auth) : null;

            if (token &&
                integrationDefinition.authProviderDetails &&
                TiltifyAuthManager.tokenExpired(token)) {

                let updatedToken: AuthDetails | null = null;
                try {
                    updatedToken = await tiltifyAPIController().refreshToken(token, authProvider);
                } catch (err) {
                    logger.warn(err);
                }
                if (updatedToken != null) {
                    integrationManager.saveIntegrationAuth(integration, updatedToken);
                    tiltifyIntegration().emit("token-refreshed", {"integrationId": integrationId, "updatedToken": updatedToken});
                }
                token = updatedToken;
            } else if (token && TiltifyAuthManager.tokenExpired(token)) {
                token = null;
            }

            if (token == null) {
                logger.warn("Could not refresh integration access token!");
                tiltifyIntegration().disconnect();
            }
        }
        return token;
    }

    /**
     * Description placeholder
     *
     * @static
     * @param {AuthDetails} token
     * @returns {boolean}
     */
    static tokenExpired(token: AuthDetails): boolean {
        return token.expires_at ? token.expires_at < new Date().getTime() : true;
    }

    /**
     * Description placeholder
     *
     * @static
     * @async
     * @returns {Promise<AuthDetails | null>}
     */
    static async refreshToken(): Promise<AuthDetails | null> {
        const integrationId: string = tiltifyIntegration().integrationId;
        // Checks if the IntegrationManager has a refreshToken Method and uses it if true.
        if (
            "refreshToken" in integrationManager &&
            typeof integrationManager.refreshToken === "function"
        ) {
            return await integrationManager.refreshToken("tiltify");
        }
        // If not, we have to implement it ourselves
        try {
            const integrationDefinition =
                integrationManager.getIntegrationDefinitionById<TiltifySettings>(
                    integrationId
                );
            if (integrationDefinition.linkType !== "auth") {
                return null;
            }
            let auth = integrationDefinition.auth;
            const authProvider = integrationDefinition.authProviderDetails;

            if (auth != null) {
                const updatedToken: AuthDetails = await tiltifyAPIController().refreshToken(auth, authProvider);

                // Save the new token
                const integration: Integration<
                    TiltifySettings,
                    TiltifyIntegrationEvents
                > =
                    integrationManager.getIntegrationById<TiltifySettings>(
                        integrationId
                    );
                integrationManager.saveIntegrationAuth(
                    integration,
                    updatedToken
                );
                auth = updatedToken;
                tiltifyIntegration().emit("token-refreshed", {"integrationId": integrationId, "updatedToken": updatedToken});
                return updatedToken;
            }
        } catch (error) {
            logger.error("Unable to refresh Tiltify token");
            logger.debug(error);

            tiltifyIntegration().disconnect();
        }
        return null;
    }

    /**
     * Converts a raw token to AuthDetails or fills missing fields from AuthDetails
     *
     * @static
     * @param {(RawTiltifyToken | AuthDetails)} tokenData
     * @returns {AuthDetails}
     */
    static getAuthDetails(tokenData: RawTiltifyToken | AuthDetails): AuthDetails {
        const accessTokenData: AuthDetails = {
            ...tokenData,
            access_token: "access_token" in tokenData ? tokenData.access_token : "", // eslint-disable-line camelcase
            refresh_token: tokenData.refresh_token, // eslint-disable-line camelcase
            token_type: "token_type" in tokenData ? tokenData.token_type : "", // eslint-disable-line camelcase
            scope: Array.isArray(tokenData.scope) ? tokenData.scope : tokenData.scope ? tokenData.scope.split(" ") : []
        };

        // Perpetuate the 'created_at' field with proper type
        if (tokenData?.created_at) {
            accessTokenData.created_at = new Date(tokenData.created_at).getTime(); // eslint-disable-line camelcase
        // If no info, assume it's created now
        } else {
            accessTokenData.created_at = new Date().getTime(); // eslint-disable-line camelcase
        }
        // Perpetuate expires_in as defined by RFC6749
        if (tokenData?.expires_in) {
            accessTokenData.expires_in = Number(tokenData.expires_in); // eslint-disable-line camelcase
        }
        // Perpetuate expires_at
        if (tokenData?.expires_at) {
            accessTokenData.expires_at = new Date(tokenData.expires_at).getTime(); // eslint-disable-line camelcase
        // Deduce it if we have enough info
        } else if (accessTokenData?.expires_in) {
            accessTokenData.expires_at = new Date(accessTokenData.created_at + 1000 * accessTokenData.expires_in).getTime(); // eslint-disable-line camelcase
        }

        return accessTokenData;
    }
}
