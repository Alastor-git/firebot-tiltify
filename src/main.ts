import {
    Firebot,
    Integration
} from "@crowbartools/firebot-custom-scripts-types";

import { TiltifySettings, integrationDefinition } from "./tiltify-integration";

import {
    logger,
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
        logger.info("Loading Tiltify Integration...");

        // Setup globals
        initModules(modules);

        // Create and Register the integration
        const integrationConfig: Integration<TiltifySettings> = {
            definition: integrationDefinition,
            integration: tiltifyIntegration(integrationDefinition.id)
        };
        integrationManager.registerIntegration(integrationConfig);

        logger.info("Tiltify Integration loaded");
    },
    stop: () => {
        logger.info("Unloading Tiltify Integration...");

        logger.info("Tiltify Integration unloaded");
    }
};

export default script;
