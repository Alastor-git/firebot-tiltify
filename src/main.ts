import {
    Firebot,
    Integration
} from "@crowbartools/firebot-custom-scripts-types";

import { TiltifySettings, integrationDefinition } from "./tiltify-integration";
import { logger } from "./tiltify-logger";

import {
    integrationManager,
    initModules
} from "@shared/firebot-modules";
import { tiltifyIntegration } from "./services";

import * as packageInfo from "../package.json";

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
            integration: tiltifyIntegration(integrationDefinition.id)
        };
        integrationManager.registerIntegration(integrationConfig);

        logger.info("Integration loaded");
    },
    stop: () => {
        logger.info("Unloading Integration...");

        tiltifyIntegration("tiltify").stop();

        logger.info("Integration unloaded");
    }
};

export default script;
