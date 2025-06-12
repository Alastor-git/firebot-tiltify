import { Logger } from "@crowbartools/firebot-custom-scripts-types/types/modules/logger";
import { logger as firebotLogger } from "@shared/firebot-modules";

const prefix: string = "Tiltify: ";

export const logger: Logger = {
    debug: message => firebotLogger.debug(`${prefix}${message}`),
    info: message => firebotLogger.info(`${prefix}${message}`),
    warn: message => firebotLogger.warn(`${prefix}${message}`),
    error: message => firebotLogger.error(`${prefix}${message}`)
};