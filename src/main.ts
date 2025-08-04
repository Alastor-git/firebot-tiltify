import {
    Firebot
} from "@crowbartools/firebot-custom-scripts-types";
import { Integration } from "./@types/firebot-custom-script-types/integration-manager";

import { TiltifySettings, integrationDefinition } from "./tiltify-integration";
import { logger } from "./tiltify-logger";

import {
    integrationManager,
    initModules
} from "@shared/firebot-modules";
import { tiltifyIntegration } from "./services";

import * as packageInfo from "../package.json";
import { TILTIFY_INTEGRATION_ID } from "./constants";

const script: Firebot.CustomScript = {
    getScriptManifest: () => {
        return {
            name: "Tiltify Integration",
            description: packageInfo.description,
            author: packageInfo.author,
            version: packageInfo.version,
            firebotVersion: "5",
            startupOnly: true
        };
    },
    getDefaultParameters: () => ({}),
    run: ({ modules }) => {
        // Setup globals
        initModules(modules);

        logger.info("Loading Integration...");

        // Create and Register the integration
        const integrationConfig: Integration<TiltifySettings> = {
            definition: integrationDefinition,
            integration: tiltifyIntegration(TILTIFY_INTEGRATION_ID)
        };
        integrationManager.registerIntegration(integrationConfig);

        logger.info("Integration loaded");
    },
    stop: () => {
        logger.info("Unloading Integration...");

        tiltifyIntegration().stop();

        logger.info("Integration unloaded");
    }
};

export default script;
