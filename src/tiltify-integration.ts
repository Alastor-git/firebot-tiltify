import {
    IntegrationEvents,
    IntegrationController,
    IntegrationData,
    IntegrationDefinition,
    LinkData,
    AuthDetails
} from "@crowbartools/firebot-custom-scripts-types";
import { TypedEmitter } from "tiny-typed-emitter";

import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { EventFilter } from "@crowbartools/firebot-custom-scripts-types/types/modules/event-filter-manager";

import * as path from "path";

import { TiltifyMilestone } from "./types/milestone";
import { TiltifyEventSource } from "./events/tiltify-event-source";

import * as Variables from "./variables";
import * as EventFilters from "./filters";

import { tiltifyPollService } from "./services";
import { TiltifyDatabase } from "@shared/database";
import { logger } from "./tiltify-logger";

import {
    integrationManager,
    variableManager,
    eventManager,
    eventFilterManager
} from "@shared/firebot-modules";
import { FirebotParams } from "@crowbartools/firebot-custom-scripts-types/types/modules/firebot-parameters";
import { TiltifyAuthManager } from "./auth-manager";

/**
 * Description placeholder
 *
 * @export
 * @typedef {TiltifySettings}
 */
export type TiltifySettings = {
    integrationSettings: {
        pollInterval: number;
    };
    campaignSettings: {
        campaignId: string;
    };
};

/**
 * Description placeholder
 *
 * @export
 * @typedef {TiltifyIntegrationEvents}
 */
export type TiltifyIntegrationEvents = IntegrationEvents & {
    "token-refreshed": (data: {integrationId: string, updatedToken: AuthDetails}) => void;
};

/**
 * Description placeholder
 *
 * @export
 * @class TiltifyIntegration
 * @typedef {TiltifyIntegration}
 * @extends {TypedEmitter<TiltifyIntegrationEvents>}
 * @implements {IntegrationController<TiltifySettings, TiltifyIntegrationEvents>}
 */
export class TiltifyIntegration
    extends TypedEmitter<TiltifyIntegrationEvents>
    implements IntegrationController<TiltifySettings, TiltifyIntegrationEvents> {
    /**
     * Description placeholder
     *
     * @private
     * @static
     * @type {TiltifyIntegration}
     */
    private static _instance: TiltifyIntegration; // eslint-disable-line no-use-before-define

    /**
     * Description placeholder
     *
     * @private
     * @readonly
     * @type {string}
     */
    private readonly dbPath: string;

    /**
     * Description placeholder
     *
     * @public
     * @type {boolean}
     */
    public connected: boolean = false;

    /**
     * Description placeholder
     *
     * @private
     * @type {TiltifyDatabase}
     */
    private db: TiltifyDatabase;

    /**
     * Description placeholder
     *
     * @public
     * @type {string}
     */
    public integrationId: string;

    /**
     * Creates an instance of TiltifyIntegration.
     *
     * @constructor
     * @private
     * @param {string} integrationId
     */
    private constructor(integrationId: string) {
        super();
        if (TiltifyIntegration._instance) {
            return TiltifyIntegration._instance;
        }
        this.connected = false;
        this.integrationId = integrationId;
        this.dbPath = path.join(SCRIPTS_DIR, "..", "db", "tiltify.db");
    }

    /**
     * Description placeholder
     *
     * @public
     * @static
     * @param {?string} [integrationId]
     * @returns {TiltifyIntegration}
     * @throws {Error} if missing Id upon first instantiation
     */
    public static instance(integrationId?: string): TiltifyIntegration {
        if (!(TiltifyIntegration._instance || integrationId)) {
            throw Error("Integration Id required upon first instantiation");
        } else if (integrationId) {
            TiltifyIntegration._instance = new TiltifyIntegration(
                integrationId
            );
        }
        return TiltifyIntegration._instance;
    }

    /**
     * Description placeholder
     *
     * @public
     * @param {boolean} _linked
     * @param {IntegrationData} _integrationData
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public init(_linked: boolean, _integrationData: IntegrationData): void {
        logger.info(`Initializing integration...`);
        // Register all events
        eventManager.registerEventSource(TiltifyEventSource);

        // Register all variables of the integration module
        const variables: ReplaceVariable[] = Object.values(Variables);
        for (const variable of variables) {
            variableManager.registerReplaceVariable(variable);
        }

        // Register all event filters of the integration module
        const filters: EventFilter[] = Object.values(EventFilters);
        for (const filter of filters) {
            eventFilterManager.registerFilter(filter);
        }

        integrationManager.on("token-refreshed", ({ integrationId }) => {
            if (integrationId === this.integrationId) {
                logger.debug("token refreshed");
            }
        });

        logger.info("Integration initialized");
    }


    /**
     * Description placeholder
     *
     * @public
     * @param {LinkData} _linkData
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public link(_linkData: LinkData): void {
        // Link is when we have received the token for the first time.
        // Once Linked, we're allowed to connect
        logger.info("integration linked.");
    }

    /**
     * Description placeholder
     * 
     * @public
     */
    public unlink(): void {
        this.disconnect();
        logger.info("integration unlinked.");
    }

    /**
     * Description placeholder
     *
     * @public
     * @async
     * @param {IntegrationData} integrationData
     * @returns {Promise<void>}
     */
    public async connect(integrationData: IntegrationData): Promise<void> {
        // Connect to the database
        try {
            this.db = new TiltifyDatabase(this.dbPath);
        } catch (error) {
            logger.warn(error);
            this.disconnect();
            return;
        }

        // disconnect if we don't have a good auth token
        if (!TiltifyAuthManager.isTokenValid()) {
            this.disconnect();
            return;
        }

        // Disconnect if the settings for the integration aren't valid.
        if (
            integrationData.userSettings == null ||
            integrationData.userSettings.campaignSettings == null
        ) {
            logger.debug("Integration settings invalid. ");
            this.disconnect();
            return;
        }

        // Checking the campaign Id is present.
        const userSettings: FirebotParams = integrationData.userSettings;
        const campaignId: string = userSettings.campaignSettings
            .campaignId as string;
        if (campaignId == null || campaignId === "") {
            logger.debug("No campaign Id. ");
            this.disconnect();
            return;
        }
        const pollInterval: number =
            (userSettings.integrationSettings.pollInterval as number) * 1000;

        // This is the loop that updates. We register it now, but it's gonna update asynchronously
        await tiltifyPollService().start(campaignId, pollInterval);

        // Check if we failed starting the polling service
        if (!tiltifyPollService().isStarted(campaignId)) {
            logger.debug("Failed to start the polling. ");
            this.disconnect();
            return;
        }

        // TODO: We should now connect to the poller service events

        // We are now connected
        this.emit("connected", this.integrationId);
        this.connected = true;
    }

    /**
     * Disconnect the Integration
     *
     * @public
     */
    public disconnect(): void {
        const integrationDefinition =
            integrationManager.getIntegrationDefinitionById<TiltifySettings>(
                "tiltify"
            );
        // Disconnect
        this.connected = false;

        tiltifyPollService().stopAll();
        logger.debug("Disconnecting Tiltify.");
        this.emit("disconnected", integrationDefinition.id);
    }

    /**
     * Update the user settings
     *
     * @public
     * @param {IntegrationData} integrationData
     */
    public onUserSettingsUpdate(integrationData: IntegrationData): void {
        // If we're connected, disconnect
        if (this.connected) {
            this.disconnect();
        }
        // Reconnect
        this.connect(integrationData);
    }

    public stop(): void {
        logger.info('Stopping integration services.');

        tiltifyPollService().stopAll();

        // Disconnect
        this.connected = false;
        logger.debug("Disconnecting Tiltify.");

        logger.info('Integration services stopped.');
    }

    /**
     * Description placeholder
     *
     * @public
     * @static
     * @returns {boolean}
     */
    public static isIntegrationConfigValid(): boolean {
        const integrationDefinition =
            integrationManager.getIntegrationDefinitionById<TiltifySettings>(
                "tiltify"
            );

        return (
            integrationDefinition?.userSettings?.campaignSettings?.campaignId !=
                null &&
            integrationDefinition?.userSettings?.campaignSettings
                ?.campaignId !== ""
        );
    }

    /**
     * Description placeholder
     *
     * @public
     * @async
     * @param {string} campaignId
     * @returns {Promise<TiltifyMilestone[]>}
     */
    public async loadMilestones(campaignId: string): Promise<TiltifyMilestone[]> {
        let savedMilestones: TiltifyMilestone[] | undefined;
        try {
            savedMilestones = (await this.db.get(
                `/tiltify/${campaignId}/milestones`
            )) as TiltifyMilestone[];
        } catch {
            logger.debug(
                `No milestones saved for campaign ${campaignId}. Initializing database. `
            );
            try {
                this.db.set(`/tiltify/${campaignId}/milestones`, []);
            } catch (error) {
                logger.warn(error);
                this.disconnect();
                savedMilestones = [];
            }
        }
        if (!savedMilestones) {
            savedMilestones = [];
        }
        return savedMilestones;
    }

    /**
     * Description placeholder
     *
     * @public
     * @param {string} campaignId
     * @param {TiltifyMilestone[]} milestones
     */
    public saveMilestones(campaignId: string, milestones: TiltifyMilestone[]): void {
        try {
            this.db.set(`/tiltify/${campaignId}/milestones`, milestones);
        } catch (error) {
            logger.warn(error);
            this.disconnect();
        }
    }

    /**
     * Description placeholder
     *
     * @public
     * @async
     * @param {string} campaignId
     * @returns {Promise<{ lastDonationDate: string; ids: string[] }>}
     */
    public async loadDonations(
        campaignId: string
    ): Promise<{ lastDonationDate: string; ids: string[] }> {
        let lastDonationDate: string;
        try {
            lastDonationDate = (await this.db.get(
                `/tiltify/${campaignId}/lastDonationDate`
            )) as string;
        } catch {
            logger.debug(
                `Couldn't find the last donation date in campaign ${campaignId}. `
            );
            lastDonationDate = "";
        }

        // Loading the IDs of known donations for this campaign
        let ids: string[] | undefined;
        try {
            ids = (await this.db.get(`/tiltify/${campaignId}/ids`)) as string[];
        } catch {
            logger.debug(
                `No donations saved for campaign ${campaignId}. Initializing database. `
            );
            try {
                this.db.set(`/tiltify/${campaignId}/ids`, []);
            } catch (error) {
                logger.warn(error);
                this.disconnect();
            }
        }
        if (!ids) {
            ids = [];
        }
        return { lastDonationDate: lastDonationDate, ids: ids };
    }

    /**
     * Description placeholder
     *
     * @public
     * @param {string} campaignId
     * @param {{ lastDonationDate: string; ids: string[] }} param0
     * @param {string} param0.lastDonationDate
     * @param {{}} param0.ids
     */
    public saveDonations(
        campaignId: string,
        { lastDonationDate, ids }: { lastDonationDate: string; ids: string[] }
    ): void {
        try {
            this.db.set(`/tiltify/${campaignId}/ids`, ids);
            this.db.set(
                `/tiltify/${campaignId}/lastDonationDate`,
                lastDonationDate
            );
        } catch (error) {
            logger.warn(error);
            this.disconnect();
        }
    }
}

/**
 * Description placeholder
 *
 * @type {IntegrationDefinition<TiltifySettings>}
 */
export const integrationDefinition: IntegrationDefinition<TiltifySettings> = {
    id: "tiltify",
    name: "Tiltify",
    description: "Tiltify donation events",
    connectionToggle: true,
    configurable: true,
    settingCategories: {
        integrationSettings: {
            title: "Integration Settings",
            settings: {
                pollInterval: {
                    title: "Poll Interval",
                    type: "number",
                    default: 5,
                    description:
                        "How often to poll Tiltify for new donations (in seconds)."
                }
            }
        },
        campaignSettings: {
            title: "Campaign Settings",
            settings: {
                campaignId: {
                    title: "Campaign ID",
                    type: "string",
                    description:
                        "ID of the running campaign to fetch donations for.",
                    default: ""
                }
            }
        }
    },
    linkType: "auth",
    authProviderDetails: {
        id: "tiltify",
        name: "Tiltify",
        redirectUriHost: "localhost",
        client: {
            id: // hidestream
            "55ee54fe15f8ee41fac947b1123ba4ea134b31de112b947c5f1afcffec471337",
            secret: // hidestream
            "b3fa00a003b5b1197d26ccc181d43801dd854906883b7279a386368a44f36293"
        },
        auth: {
            // @ts-ignore
            type: "code",
            tokenHost: "https://v5api.tiltify.com", // Move to authorizeHost ? tokenHost is used as default
            authorizePath: "/oauth/authorize",
            tokenPath: "/oauth/token" // To be removed when removing token flow
        },
        autoRefreshToken: true,
        scopes: "public"
    }
};

/**
 * Description placeholder
 *
 * @type {typeof TiltifyIntegration.instance}
 */
export const tiltifyIntegration: typeof TiltifyIntegration.instance =
    TiltifyIntegration.instance.bind(TiltifyIntegration);
