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

import axios from "axios";
import * as path from "path";

import { TiltifyMilestone } from "./types/milestone";
import { TiltifyEventSource } from "./events/tiltify-event-source";

import * as Variables from "./variables";
import * as EventFilters from "./filters";

import { tiltifyAPIController, tiltifyPollService } from "./services";
import { TiltifyDatabase } from "@shared/database";

import {
    logger,
    integrationManager,
    variableManager,
    eventManager,
    eventFilterManager,
    frontendCommunicator
} from "@shared/firebot-modules";
import { FirebotParams } from "@crowbartools/firebot-custom-scripts-types/types/modules/firebot-parameters";

export type TiltifySettings = {
    integrationSettings: {
        pollInterval: number;
    };
    campaignSettings: {
        campaignId: string;
    };
};

type TiltifyIntegrationEvents = IntegrationEvents;

export class TiltifyIntegration
    extends TypedEmitter<TiltifyIntegrationEvents>
    implements IntegrationController<TiltifySettings, TiltifyIntegrationEvents> {
    // eslint-disable-next-line no-use-before-define
    private static _instance: TiltifyIntegration;
    readonly dbPath: string;

    timeout: NodeJS.Timeout;
    connected = false;
    private db: TiltifyDatabase;
    public integrationId: string;

    private constructor(integrationId: string) {
        super();
        if (TiltifyIntegration._instance) {
            return TiltifyIntegration._instance;
        }
        this.timeout = null;
        this.connected = false;
        this.integrationId = integrationId;
        this.dbPath = path.join(SCRIPTS_DIR, "..", "db", "tiltify.db");
        this.db = new TiltifyDatabase(this.dbPath);
        TiltifyIntegration._instance = this;
    }

    public static instance(integrationId?: string): TiltifyIntegration {
        if (!TiltifyIntegration._instance && !integrationId) {
            throw Error("Integration Id required upon first instantiation");
        }
        return (
            TiltifyIntegration._instance ||
            (TiltifyIntegration._instance = new TiltifyIntegration(
                integrationId
            ))
        );
    }

    init(linked: boolean, integrationData: IntegrationData) {
        logger.info(`Initializing Tiltify integration...`);
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

        frontendCommunicator.onAsync("get-tiltify-rewards", async () => {
            if (!TiltifyIntegration.isIntegrationConfigValid()) {
                throw new Error(
                    "Tiltify integration not found or not configured"
                );
            }

            const integration =
                integrationManager.getIntegrationDefinitionById<TiltifySettings>(
                    this.integrationId
                );
            const campaignId =
                integration.userSettings.campaignSettings.campaignId;

            return await tiltifyAPIController().getRewards(campaignId);
        });

        frontendCommunicator.onAsync("get-tiltify-poll-options", async () => {
            if (!TiltifyIntegration.isIntegrationConfigValid()) {
                throw new Error(
                    "Tiltify integration not found or not configured"
                );
            }

            const integration =
                integrationManager.getIntegrationDefinitionById<TiltifySettings>(
                    this.integrationId
                );
            const campaignId =
                integration.userSettings.campaignSettings.campaignId;

            return await tiltifyAPIController().getPollOptions(campaignId);
        });

        frontendCommunicator.onAsync("get-tiltify-challenges", async () => {
            if (!TiltifyIntegration.isIntegrationConfigValid()) {
                throw new Error(
                    "Tiltify integration not found or not configured"
                );
            }

            const integration =
                integrationManager.getIntegrationDefinitionById<TiltifySettings>(
                    "tiltify"
                );
            const campaignId =
                integration.userSettings.campaignSettings.campaignId;

            return await tiltifyAPIController().getTargets(campaignId);
        });

        integrationManager.on("token-refreshed", ({ integrationId }) => {
            if (integrationId === this.integrationId) {
                logger.debug("Tiltify token refreshed");
            }
        });

        logger.info("Tiltify integration loaded");
    }

    link(linkData: LinkData) {
        // Link is when we have received the token for the first time.
        // Once Linked, we're allowed to connect
        logger.info("Tiltify integration linked.");
    }

    unlink() {
        logger.info("Tiltify integration unlinked.");
    }

    async isTokenValid(): Promise<boolean> {
        // Get the saved access token
        const authData = await integrationManager.getAuth(this.integrationId);
        let token: AuthDetails;
        if (authData === null) {
            logger.debug("Tiltify : Couldn't retrieve a valid token. ");
            logger.debug("Tiltify : Attempting to refresh token. ");
            token = await integrationManager.refreshToken(this.integrationId);
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
        token = await integrationManager.refreshToken(this.integrationId);
        // The refreshing fails.
        if (token === null) {
            logger.debug("Tiltify : Refreshing token failed. ");
            return false;
        }
    }

    async getAuth(): Promise<AuthDetails> {
        const authData: LinkData = await integrationManager.getAuth(
            this.integrationId
        );
        if (authData === null || "auth" in authData === false) {
            return;
        }
        return authData.auth;
    }

    async connect(integrationData: IntegrationData) {
        // disconnect if we don't have a good auth token
        if (!this.isTokenValid()) {
            logger.debug("Tiltify : Disconnecting Tiltify.");
            this.emit("disconnected", this.integrationId);
            this.connected = false;
            return;
        }

        // Disconnect if the settings for the integration aren't valid.
        if (
            integrationData.userSettings == null ||
            integrationData.userSettings.campaignSettings == null
        ) {
            logger.debug("Tiltify : Integration settings invalid. ");
            logger.debug("Tiltify : Disconnecting Tiltify.");
            this.emit("disconnected", this.integrationId);
            this.connected = false;
            return;
        }

        // Checking the campaign Id is present.
        const userSettings: FirebotParams = integrationData.userSettings;
        const campaignId: string = userSettings.campaignSettings
            .campaignId as string;
        if (campaignId == null || campaignId === "") {
            logger.debug("Tiltify : No campaign Id. ");
            logger.debug("Tiltify : Disconnecting Tiltify.");
            this.emit("disconnected", this.integrationId);
            this.connected = false;
            return;
        }
        const pollInterval: number =
            (userSettings.integrationSettings.pollInterval as number) * 1000;

        // This is the loop that updates. We register it now, but it's gonna update asynchronously
        await tiltifyPollService().start(campaignId, pollInterval);

        // Check if we failed starting the polling service
        if (!tiltifyPollService().isStarted(campaignId)) {
            logger.debug("Tiltify : Failed to start the polling. ");
            logger.debug("Tiltify : Disconnecting Tiltify.");
            this.emit("disconnected", this.integrationId);
            this.connected = false;
            return;
        }

        // TODO: We should now connect to the poller service events

        // We are now connected
        this.emit("connected", this.integrationId);
        this.connected = true;
    }

    // Disconnect the Integration
    disconnect() {
        const integrationDefinition =
            integrationManager.getIntegrationDefinitionById<TiltifySettings>(
                "tiltify"
            );
        // Clear the event processing loop
        if (this.timeout) {
            clearInterval(this.timeout);
        }
        // Disconnect
        this.connected = false;
        this.emit("disconnected", integrationDefinition.id);
    }

    // Update the user settings
    onUserSettingsUpdate(integrationData: IntegrationData) {
        // If we're connected, disconnect
        if (this.connected) {
            this.disconnect();
        }
        // Reconnect
        this.connect(integrationData);
    }

    // Doing this here because of a bug in Firebot where it isn't refreshing automatically
    async refreshToken(integrationId: string): Promise<string> {
        // Checks if the IntegrationManager has a refreshToken Method and uses it if true.
        if (typeof integrationManager.refreshToken === "function") {
            const authData = await integrationManager.refreshToken("tiltify");
            return authData.access_token;
        }
        // If not, we have to implement it ourselves
        try {
            const integrationDefinition =
                integrationManager.getIntegrationDefinitionById<TiltifySettings>(
                    integrationId
                );
            if (integrationDefinition.linkType !== "auth") {
                return;
            }
            const auth = integrationDefinition.auth;
            const authProvider = integrationDefinition.authProviderDetails;

            if (auth != null) {
                const url = `${authProvider.auth.tokenHost}${authProvider.auth.tokenPath}?client_id=${authProvider.client.id}&client_secret=${authProvider.client.secret}&grant_type=refresh_token&refresh_token=${auth.refresh_token}&scope=${authProvider.scopes}`;
                const response = await axios.post(url);

                if (response.status === 200) {
                    const int =
                        integrationManager.getIntegrationById<TiltifySettings>(
                            integrationId
                        );
                    integrationManager.saveIntegrationAuth(int, response.data);

                    return response.data.access_token;
                }
            }
        } catch (error) {
            logger.error("Unable to refresh Tiltify token");
            logger.debug(error);
        }

        return;
    }

    static isIntegrationConfigValid(): boolean {
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

    async loadMilestones(campaignId: string): Promise<TiltifyMilestone[]> {
        let savedMilestones: TiltifyMilestone[];
        try {
            savedMilestones = (await this.db.get(
                `/tiltify/${campaignId}/milestones`
            )) as TiltifyMilestone[];
        } catch {
            logger.debug(
                `Tiltify : No milestones saved for campaign ${campaignId}. Initializing database. `
            );
            this.db.set(`/tiltify/${campaignId}/milestones`, []);
        }
        if (!savedMilestones) {
            savedMilestones = [];
        }
        return savedMilestones;
    }

    saveMilestones(campaignId: string, milestones: TiltifyMilestone[]): void {
        this.db.set(`/tiltify/${campaignId}/milestones`, milestones);
    }

    async loadDonations(
        campaignId: string
    ): Promise<{ lastDonationDate: string; ids: string[] }> {
        let lastDonationDate: string;
        try {
            lastDonationDate = (await this.db.get(
                `/tiltify/${campaignId}/lastDonationDate`
            )) as string;
        } catch {
            logger.debug(
                `Tiltify : Couldn't find the last donation date in campaign ${campaignId}. `
            );
            lastDonationDate = null;
        }

        // Loading the IDs of known donations for this campaign
        let ids: string[];
        try {
            ids = (await this.db.get(`/tiltify/${campaignId}/ids`)) as string[];
        } catch {
            logger.debug(
                `Tiltify : No donations saved for campaign ${campaignId}. Initializing database. `
            );
            this.db.set(`/tiltify/${campaignId}/ids`, []);
        }
        if (!ids) {
            ids = [];
        }
        return { lastDonationDate: lastDonationDate, ids: ids };
    }

    saveDonations(
        campaignId: string,
        { lastDonationDate, ids }: { lastDonationDate: string; ids: string[] }
    ): void {
        this.db.set(`/tiltify/${campaignId}/ids`, ids);
        this.db.set(
            `/tiltify/${campaignId}/lastDonationDate`,
            lastDonationDate
        );
    }
}

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
            id: "55ee54fe15f8ee41fac947b1123ba4ea134b31de112b947c5f1afcffec471337",
            secret: "b3fa00a003b5b1197d26ccc181d43801dd854906883b7279a386368a44f36293"
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

export const tiltifyIntegration: typeof TiltifyIntegration.instance =
    TiltifyIntegration.instance.bind(TiltifyIntegration);
