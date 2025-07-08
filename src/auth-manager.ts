import {
    AuthDetails,
    Integration
} from "@crowbartools/firebot-custom-scripts-types";
import { tiltifyAPIController, tiltifyIntegration } from "@/services";

import { integrationManager } from "@shared/firebot-modules";
import { logger } from "./tiltify-logger";
import {
    TiltifySettings
} from "@/tiltify-integration";
import { AuthProviderDefinition } from "@crowbartools/firebot-custom-scripts-types/types/modules/auth-manager";
import { TILTIFY_INTEGRATION_ID } from "./constants";

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
            logger.debug("Couldn't retrieve a valid token. ");
            return false;
        }

        // Check whether the token is still valid.
        if ((await tiltifyAPIController().validateToken()) === true) {
            return true;
        }
        // Token wasn't valid, attempt to refresh it
        logger.debug("Token invalid. ");
        logger.debug("Attempting to forcibly refresh the token. ");
        token = await TiltifyAuthManager.getAuth(true);
        // The refreshing fails.
        if (token === null) {
            logger.debug("Refreshing token failed. ");
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
    static async getAuth(force: boolean = false): Promise<AuthDetails | null> {
            const integration: Integration = integrationManager.getIntegrationById(TILTIFY_INTEGRATION_ID);
            const integrationDefinition =
                integrationManager.getIntegrationDefinitionById<TiltifySettings>(
                    TILTIFY_INTEGRATION_ID
                );
            if (integration == null || !integrationDefinition.linked) {
            logger.warn("Integration is not linked!");
                tiltifyIntegration().disconnect();
                return null;
            }

            let token: AuthDetails | null = null;
            if (integrationDefinition.linkType !== "auth") {
            logger.warn("Integration has the wrong link type!");
            tiltifyIntegration().disconnect();
                return null;
            }
            const authProvider: AuthProviderDefinition = integrationDefinition.authProviderDetails;
            token = integrationDefinition.auth ? TiltifyAuthManager.getAuthDetails(integrationDefinition.auth) : null;

        if (!authProvider) {
            token = null;
        } else if (token && (force || TiltifyAuthManager.tokenExpired(token))) {

                let updatedToken: AuthDetails | null = null;
                try {
                    updatedToken = await tiltifyAPIController().refreshToken(token, authProvider);
                } catch (err) {
                    logger.warn(err);
                }
                if (updatedToken != null) {
                    integrationManager.saveIntegrationAuth(integration, updatedToken);
                    tiltifyIntegration().emit("token-refreshed", {"integrationId": TILTIFY_INTEGRATION_ID, "updatedToken": updatedToken});
                }
                token = updatedToken;
            }

            if (token == null) {
                logger.warn("Could not refresh integration access token!");
                tiltifyIntegration().disconnect();
        }
        return token;
    }

    /**
     * Returns true if the token has expired or will expire within the next second
     *
     * @static
     * @param {AuthDetails} token
     * @returns {boolean}
     */
    static tokenExpired(token: AuthDetails): boolean {
        return token.expires_at ? token.expires_at - 1000 < Date.now() : true;
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
            accessTokenData.created_at = Date.now(); // eslint-disable-line camelcase
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
