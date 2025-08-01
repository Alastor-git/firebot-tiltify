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
import { TiltifyAuthManager } from "./auth-manager";
import { TILTIFY_INTEGRATION_ID } from "./constants";
import { TiltifyDonationMatchCollection } from "./types/donation-match";
import { TiltifyPollingOptions } from "./services/pollService/tiltify-poll-service";

/**
 * Description placeholder
 *
 * @export
 * @typedef {TiltifySettings}
 */
export type TiltifySettings = {
    integrationSettings: {
        pollInterval: number;
        donationMatchesPollingMultiplier: number;
        milestonesPollingMultiplier: number;
        verboseMode: boolean;
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
        for (const event of TiltifyEventSource.events) {
            logger.debug(`Registered event ${event.name}`);
        }

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

        this.on("token-refreshed", ({ integrationId }) => {
            if (integrationId === this.integrationId) {
                logger.debug("Token refreshed");
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
        if (!await TiltifyAuthManager.isTokenValid()) {
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
        const userSettings: TiltifySettings = integrationData.userSettings as TiltifySettings;
        const campaignId: string = userSettings.campaignSettings
            .campaignId as string;
        if (campaignId == null || campaignId === "") {
            logger.debug("No campaign Id. ");
            this.disconnect();
            return;
        }

        const integrationSettings = userSettings.integrationSettings;
        const pollingOptions: Partial<TiltifyPollingOptions> = {
            pollingInterval: integrationSettings.pollInterval * 1000,
            donationMatchesPollingMultiplier: integrationSettings.donationMatchesPollingMultiplier,
            milestonesPollingMultiplier: integrationSettings.milestonesPollingMultiplier,
            verboseMode: integrationSettings.verboseMode
        };

        // This is the loop that updates. We register it now, but it's gonna update asynchronously
        await tiltifyPollService().start(campaignId, pollingOptions);

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
        // Disconnect
        this.connected = false;

        tiltifyPollService().stopAll();
        logger.info("Disconnecting Tiltify.");
        this.emit("disconnected", TILTIFY_INTEGRATION_ID);
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
        this.connected = false;
        logger.info('Stopping integration services.');

        tiltifyPollService().stopAll();

        // Disconnect
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
                TILTIFY_INTEGRATION_ID
            );

        return (
            integrationDefinition?.userSettings?.campaignSettings?.campaignId !=
                null &&
            integrationDefinition?.userSettings?.campaignSettings
                ?.campaignId !== ""
        );
    }

    /**
     * Loads the Milestones for the camaign from the database
     *
     * @public
     * @async
     * @param {string} campaignId
     * @returns {Promise<TiltifyMilestone[]>}
     */
    public async loadSavedMilestones(campaignId: string): Promise<TiltifyMilestone[]> {
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
     * Saves the Milestones of the campaign to the database
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
     * Loads the donation ids for the campaign from the database
     *
     * @public
     * @async
     * @param {string} campaignId
     * @returns {Promise<{ lastDonationDate: string; ids: string[] }>}
     */
    public async loadSavedDonations(
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
     * Saves the donation ids of the campaign in the database
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

    /**
     * Loads the donation Matches for this campaign saved in the database
     *
     * @public
     * @async
     * @param {string} campaignId
     * @returns {Promise<{ lastDonationMatchUpdate: string; savedDonationMatches: TiltifyDonationMatchCollection }>}
     */
    async loadSavedDonationMatches(campaignId: string): Promise<{ lastDonationMatchUpdate: string, savedDonationMatches: TiltifyDonationMatchCollection }> {
        let lastDonationMatchUpdate: string;
        try {
            lastDonationMatchUpdate = (await this.db.get(
                `/tiltify/${campaignId}/lastDonationMatchUpdate`
            )) as string;
        } catch {
            logger.debug(
                `Couldn't find the last donation match update date in campaign ${campaignId}. `
            );
            lastDonationMatchUpdate = "";
        }

        // Loading the IDs of known donations for this campaign
        let savedDonationMatches: TiltifyDonationMatchCollection | undefined;
        try {
            savedDonationMatches = (await this.db.get(`/tiltify/${campaignId}/donationMatches`)) as TiltifyDonationMatchCollection;
        } catch {
            logger.debug(
                `No donation matches saved for campaign ${campaignId}. Initializing database. `
            );
            try {
                this.db.set(`/tiltify/${campaignId}/donationMatches`, {});
            } catch (error) {
                logger.warn(error);
                this.disconnect();
            }
        }
        if (!savedDonationMatches) {
            savedDonationMatches = {};
        }
        return { lastDonationMatchUpdate: lastDonationMatchUpdate, savedDonationMatches: savedDonationMatches };
    }

    /**
     * Saves the donation matches of the campaign in the database
     *
     * @public
     * @param {string} campaignId
     * @param {{ lastDonationMatchUpdate: string; donationMatches: TiltifyDonationMatchCollection }} param0
     * @param {string} param0.lastDonationMatchUpdate
     * @param {TiltifyDonationMatchCollection} param0.donationMatches
     */
    public saveDonationMatches(
        campaignId: string,
        { lastDonationMatchUpdate, donationMatches }: { lastDonationMatchUpdate: string; donationMatches: TiltifyDonationMatchCollection }
    ): void {
        try {
            this.db.set(`/tiltify/${campaignId}/donationMatches`, donationMatches);
            this.db.set(
                `/tiltify/${campaignId}/lastDonationMatchUpdate`,
                lastDonationMatchUpdate
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
    id: TILTIFY_INTEGRATION_ID,
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
                },
                donationMatchesPollingMultiplier: {
                    title: "Donation Matches Polling Multiplier",
                    type: "number",
                    default: 3,
                    description:
                        "Every how many cycles do we check for new donation Matches ? "
                },
                milestonesPollingMultiplier: {
                    title: "Milestones Polling Multiplier",
                    type: "number",
                    default: 10,
                    description:
                        "Every how many cycles do we check for new milestones ? "
                },
                verboseMode: {
                    title: "Verbose mode",
                    type: "boolean",
                    default: false,
                    description:
                        "Log extra data (for development purposes)"
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
