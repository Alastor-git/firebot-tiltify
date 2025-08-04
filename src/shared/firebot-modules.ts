import { IntegrationManager } from "@/@types/firebot-custom-script-types/integration-manager";
import { ScriptModules } from "@crowbartools/firebot-custom-scripts-types";
//import { HttpServerManager } from "@crowbartools/firebot-custom-scripts-types/types/modules/http-server-manager";
import { JsonDB } from "node-json-db";

export declare let logger: ScriptModules["logger"];
export declare let frontendCommunicator: ScriptModules["frontendCommunicator"];
export declare let effectRunner: ScriptModules["effectRunner"];
export declare let effectManager: ScriptModules["effectManager"];
export declare let eventManager: ScriptModules["eventManager"];
export declare let eventFilterManager: ScriptModules["eventFilterManager"];
//export declare let httpServer: HttpServerManager;
export declare let variableManager: ScriptModules["replaceVariableManager"];
export declare let integrationManager: IntegrationManager;
export declare let uiExtensionManager: ScriptModules["uiExtensionManager"];
export declare let jsonDb: JsonDB;
export declare let utils: ScriptModules["utils"];
export function initModules(scriptModules: ScriptModules): void {
    logger = scriptModules.logger;
    frontendCommunicator = scriptModules.frontendCommunicator;
    effectRunner = scriptModules.effectRunner;
    effectManager = scriptModules.effectManager;
    eventManager = scriptModules.eventManager;
    eventFilterManager = scriptModules.eventFilterManager;
    variableManager = scriptModules.replaceVariableManager;
    integrationManager = scriptModules.integrationManager as IntegrationManager;
    uiExtensionManager = scriptModules.uiExtensionManager;
    jsonDb = scriptModules.JsonDb as JsonDB;
    utils = scriptModules.utils;
//    httpServer = scriptModules.httpServer;
}
