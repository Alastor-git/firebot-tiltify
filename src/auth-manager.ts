import {
    AuthDetails,
    LinkData
} from "@crowbartools/firebot-custom-scripts-types";
import { tiltifyAPIController, tiltifyIntegration } from "@/services";

import { logger, integrationManager } from "@shared/firebot-modules";

export class TiltifyAuthManager {
    static async isTokenValid(): Promise<boolean> {
        // Get the saved access token
        const authData = await integrationManager.getAuth(
            tiltifyIntegration().integrationId
        );
        let token: AuthDetails;
        if (authData === null) {
            logger.debug("Tiltify : Couldn't retrieve a valid token. ");
            logger.debug("Tiltify : Attempting to refresh token. ");
            token = await integrationManager.refreshToken(
                tiltifyIntegration().integrationId
            );
        } else {
            if ("auth" in authData === false) {
                logger.warn("Tiltify : Invalid authentication data. ");
                return false;
            }
            token = authData.auth;
        }
        // Check whether the token is still valid.
        if ((await tiltifyAPIController().validateToken()) === true) {
            return true;
        }
        // Token wasn't valid, attempt to refresh it
        logger.debug("Tiltify : Token invalid. ");
        logger.debug("Tiltify : Attempting to refresh token. ");
        token = await integrationManager.refreshToken(
            tiltifyIntegration().integrationId
        );
        // The refreshing fails.
        if (token === null) {
            logger.debug("Tiltify : Refreshing token failed. ");
            return false;
        }
        return true;
    }

    static async getAuth(): Promise<AuthDetails | null> {
        const authData: LinkData = await integrationManager.getAuth(
            tiltifyIntegration().integrationId
        );
        if (authData === null || "auth" in authData === false) {
            return null;
        }
        return authData.auth;
    }
}
