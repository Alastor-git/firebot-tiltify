import { AbstractPollService } from "./poll-service";
import { eventManager } from "@shared/firebot-modules";
import { logger } from "@/tiltify-logger";

import {
    PopulatingTiltifyCampaignData,
    TiltifyCampaignDataStep1,
    TiltifyCampaignDataStep2,
    TiltifyCampaignDataStep3
} from "@/types/campaign-data";
import { TiltifyMilestone } from "@/types/milestone";
import { TiltifyCampaignReward, TiltifyRewardClaim } from "@/types/campaign-reward";
import {
    TILTIFY_DONATION_EVENT_ID,
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_INTEGRATION_ID,
    TILTIFY_MILESTONE_EVENT_ID
} from "@/constants";

import { tiltifyAPIController, tiltifyIntegration } from "@/services";

import "@/events/donation-event-data"; // Solves module augmentation is not loaded
import { TiltifyDonationEventData } from "@/events/donation-event-data";
import "@/events/milestone-reached-event-data"; // Solves module augmentation is not loaded
import { TiltifyMilestoneReachedEventData } from "@/events/milestone-reached-event-data";
import { TiltifyDonation } from "@/types/donation";
import { CampaignEvent } from "@/events/campaign-event-data";
import { TiltifyCampaign } from "@/types/campaign";
import { TiltifyCause } from "@/types/cause";
import { TiltifyAPIError } from "@/shared/errors";
import { TiltifyDonationMatch, TiltifyDonnationMatchCollection } from "@/types/donation-match";

/**
 * Description placeholder
 *
 * @export
 * @class TiltifyPollService
 * @typedef {TiltifyPollService}
 * @extends {AbstractPollService}
 */
export class TiltifyPollService extends AbstractPollService {
    /**
     * Description placeholder
     *
     * @private
     * @static
     * @type {TiltifyPollService}
     */
    private static _instance: TiltifyPollService;

    /**
     * Description placeholder
     *
     * @protected
     * @type {{
     *         [campaignId: string]: PopulatingTiltifyCampaignData;
     *     }}
     */
    declare protected pollerData: {
        [campaignId: string]: PopulatingTiltifyCampaignData;
    };

    /**
     * Description placeholder
     *
     * @protected
     * @type {{ [campaignId: string]: boolean }}
     */
    declare protected pollerStarted: { [campaignId: string]: boolean };

    /**
     * Creates an instance of TiltifyPollService.
     *
     * @constructor
     * @private
     */
    private constructor() {
        super();
    }

    /**
     * Description placeholder
     *
     * @public
     * @static
     * @returns {TiltifyPollService}
     */
    public static instance(): TiltifyPollService {
        return (
            TiltifyPollService._instance ||
            (TiltifyPollService._instance = new TiltifyPollService())
        );
    }

    /**
     * Description placeholder
     *
     * @protected
     * @async
     * @param {string} campaignId
     * @returns {Promise<void>}
     */
    protected async startPollActions(campaignId: string): Promise<void> {
        // TODO: Include here the actions you need to do only once before the poll starts

        // Initiate the poller's data
        this.pollerData[campaignId] = {
            Step: "Step 1",
            campaignId: campaignId,
            cause: undefined,
            campaign: undefined,
            milestones: [],
            rewards: [],
            lastDonationMatchUpdate: "",
            donationMatches: {},
            lastDonationDate: "",
            donationIds: []
        };
        // Populate the poller's data

        // If impossible, disconnect the campaign
        try {
            // Load info about the campaign.
            this.pollerData[campaignId] = await this.loadCampaign(
                this.pollerData[campaignId]
            );
            // Load info about the cause.
            this.pollerData[campaignId] = await this.loadCause(
                this.pollerData[campaignId]
            );
            // Load info about the rewards.
            await this.loadRewards(campaignId);
            // Load info about the Milestones.
            await this.loadMilestones(campaignId);
            // Load info about donation matches
            await this.loadDonationMatches(campaignId);
        } catch (error) {
            logger.debug(
                `Stopped polling ${campaignId} because of an error.`
            );
            logger.debug(error);
            this.pollerStarted[campaignId] = false;
        }
    }

    /**
     * Description placeholder
     *
     * @protected
     * @async
     * @param {string} campaignId
     * @returns {Promise<void>}
     */
    protected async poll(campaignId: string): Promise<void> {
        // TODO : Poll here the data from Tiltify
        try {
            // Check for new donations
            await this.updateDonations(campaignId);

            // Check for milestones reached
            await this.updateMilestones(campaignId);

            // After a success
            this.pollingSuccess(campaignId);
        } catch (error) {
            if (!(campaignId in this.pollerStatus)) {
                logger.debug(`An error happened after the poller for campaign ${campaignId} was deleted.`);
                return;
            }
            const pollerStatus = this.pollerStatus[campaignId];
            if (error instanceof TiltifyAPIError) {
                const errorCode:number = error.errorCode;
                const errorMessage:string = error.message;
                if (errorCode >= 500 && errorCode < 600) {
                    // Server errors
                    // Observed :
                    // - 502: Bad Gateway or Proxy Error
                    // - 520: Unknown API error
                    logger.debug(`Received API error ${error.errorCode} while polling campaign ${campaignId}: ${errorMessage}.`);
                    if (pollerStatus.retryMode === "None") {
                        pollerStatus.retryMode = "Backoff";
                    }
                    // Display the retry message every time if we're still in the correct mode
                    if (pollerStatus.retryMode === "Backoff") {
                        logger.info(`Trying to reconnect campaign ${campaignId} after a delay`);
                    }
                } else if (errorCode === 401) {
                    // 401: Unauthorized
                    logger.debug(`Received API error ${errorCode} while polling campaign ${campaignId}: ${errorMessage}.`);
                    if (pollerStatus.retryMode === "None" || pollerStatus.retryMode === "Backoff") {
                        pollerStatus.retryMode = "Once";
                    }
                    // Display the retry message every time if we're still in the correct mode
                    if (pollerStatus.retryMode === "Once") {
                        logger.info(`Polling of campaign ${campaignId} has failed. Trying to reconnect once.`);
                    }
                } else if (errorCode === 404) {
                    // 404: Ressource Not Found
                    logger.debug(`Received API error ${errorCode} while polling campaign ${campaignId}: ${errorMessage}.`);
                    pollerStatus.retryMode = "Shutdown";
                    logger.info(`Campaign ${campaignId} cound not be found.`);
                } else if (errorCode === 422) {
                    // 422: Unprocessible entity
                    logger.debug(`Received API error ${errorCode} while polling campaign ${campaignId}: ${errorMessage}.`);
                    pollerStatus.retryMode = "Shutdown";
                    logger.info(`Internal Tiltify error while prossessing campaign ${campaignId} data.`);
                } else {
                    // Standard other error. Probably a 4XX error
                    logger.debug(`Received API error ${errorCode} while polling campaign ${campaignId}: ${errorMessage}.`);
                    pollerStatus.retryMode = "Shutdown";
                    logger.info(`Tiltify error while polling campaign ${campaignId} data with HTTP code ${errorCode}.`);
                }
            } else {
                this.pollerStatus[campaignId].retryMode = "Shutdown";
                logger.info(
                    `Stop polling ${campaignId} because of an error.`
                );
                logger.debug(error);
            }
        }
    }

    /**
     * Description placeholder
     *
     * @protected
     * @param {string} campaignId
     */
    protected stopPollActions(campaignId: string): void {
        // TODO : Include here the actions you need to do only once after the poll ends
        this.checkIfIntegrationDisconnected();
    }

    /**
     * Description placeholder
     *
     * @async
     * @param {TiltifyCampaignDataStep1} campaignData
     * @returns {Promise<TiltifyCampaignDataStep2>}
     * @throws {Error} id campaign data is invalid or not loaded
     */
    async loadCampaign(
        campaignData: TiltifyCampaignDataStep1
    ): Promise<TiltifyCampaignDataStep2> {
        // Populate information about the campaign. This is mandatory to have. If not, we have a problem.
        // This contains the money raised, so it will update

        // Load the campaign data
        try {
            const campaign: TiltifyCampaign =
                await tiltifyAPIController().getCampaign(
                    campaignData.campaignId
                );
            // Check that the campaign data is valid
            const causeId = campaign.cause_id;
            if (causeId === "") {
                throw new Error("Campaign data invalid. ");
            }
            return { ...campaignData, campaign: campaign, Step: "Step 2" };
        } catch (error) {
            logger.warn(
                `Information about campaign ${campaignData.campaignId} couldn't be retrieved or are invalid. Message: ${error.message}`
            );
            throw new Error("Campaign not loaded", { cause: error });
        }
    }

    /**
     * Description placeholder
     *
     * @async
     * @param {TiltifyCampaignDataStep2} campaignData
     * @returns {Promise<TiltifyCampaignDataStep3>}
     * @throws {Error} if cause data can't get loaded
     */
    async loadCause(
        campaignData: TiltifyCampaignDataStep2
    ): Promise<TiltifyCampaignDataStep3> {
        // Populate info about the cause the campaign is collecting for. This should not change
        try {
            // Collect data about the cause
            const cause: TiltifyCause = await tiltifyAPIController().getCause(
                campaignData.campaign.cause_id
            );
            return { ...campaignData, cause: cause, Step: "Step 3" };
        } catch (error) {
            logger.warn(
                `Information about cause ${campaignData.campaign.cause_id} couldn't be retrieved or are invalid. Message: ${error.message}`
            );
            throw new Error("Cause not loaded", { cause: error });
        }
    }

    /**
     * Description placeholder
     *
     * @async
     * @param {string} campaignId
     * @param {boolean} [verbose=true]
     * @returns {Promise<void>}
     * @throws {TiltifyAPIError} if milestones can't be loaded
     */
    async loadMilestones(campaignId: string, verbose: boolean = true): Promise<void> {
        // Populate info about the Milestones.
        // This is gonna update to reflect the activation and possible new Milestones.
        try {
            this.pollerData[campaignId].milestones =
                await tiltifyAPIController().getMilestones(campaignId);
        } catch (error) {
            logger.warn(
                `Information about Milestones for ${campaignId} couldn't be retrieved or are invalid. Message: ${error.message}`
            );
            throw error;
        }
        // Load saved milestones if any
        // They are saved to keep memory of which milestones have previously been reached so we know what events to trigger
        const savedMilestones: TiltifyMilestone[] =
            await tiltifyIntegration().loadSavedMilestones(campaignId);

        this.pollerData[campaignId].milestones.forEach(
            (milestone: TiltifyMilestone) => {
                // Check if loaded milestone has been reached
                milestone.reached =
                    Number(
                        this.pollerData[campaignId].campaign?.amount_raised
                            ?.value ?? 0
                    ) >= Number(milestone.amount?.value);
                // Checked the saved value for the milestone
                const savedMilestone: TiltifyMilestone | null =
                    savedMilestones.find(
                        (mi: TiltifyMilestone) => mi.id === milestone.id
                    ) ?? null;
                // If the milestone was unknown
                if (!savedMilestone) {
                    // Set reached as false so the event triggers
                    milestone.reached = false;
                    logger.debug(
                        `Campaign Milestone ${milestone.name} is new. `
                    );
                } else if (milestone.reached && !savedMilestone.reached) {
                    // If the saved milestone was unreached, we want to make sure that if it's currently reached, we trip the event too
                    milestone.reached = false;
                    logger.debug(
                        `Campaign Milestone ${milestone.name} is has been reached while Tiltify was offline. Ensuring the event triggers. `
                    );
                }
            },
            this
        );
        // Save the loaded milestones
        tiltifyIntegration().saveMilestones(
            campaignId,
            this.pollerData[campaignId].milestones
        );
        // Log the new Milestones state
        if (verbose) {
            logger.debug(
                "Campaign Milestones: \n".concat(
                    this.pollerData[campaignId].milestones
                        .map(
                            mi => `
    ID: ${mi.id}
    Name: ${mi.name}
    Amount: $${mi.amount?.value}
    Active: ${mi.active}
    Reached: ${mi.reached}`
                        )
                        .join("\n")
                )
            );
        }
    }

    /**
     * Description placeholder
     *
     * @async
     * @param {string} campaignId
     * @param {boolean} [verbose=true]
     * @returns {Promise<void>}
     * @throws {TiltifyAPIError} if rewards can't be loaded
     */
    async loadRewards(campaignId: string, verbose: boolean = true): Promise<void> {
        // Populate info about the rewards offered.
        // This is gonna update to reflect the quantities available and offered and possible new rewards.

        try {
            this.pollerData[campaignId].rewards =
                await tiltifyAPIController().getRewards(campaignId);
        } catch (error) {
            logger.warn(
                `Information about Rewards for ${campaignId} couldn't be retrieved or are invalid. Message: ${error.message}`
            );
            throw error;
        }
        if (verbose) {
            logger.debug(
                "Campaign Rewards: \n".concat(
                    this.pollerData[campaignId].rewards
                        .map(
                            re => `
    ID: ${re.id}
    Name: ${re.name}
    Amount: $${re.amount?.value}
    Active: ${re.active}`
                        )
                        .join("\n")
                )
            );
        }
    }

    /**
     * Loads Donation matches from the database and looks for updates from the API to raise events that might have been missed while the integration was disconnected.
     *
     * @async
     * @param {string} campaignId
     * @param {boolean} [verbose=true]
     * @returns {Promise<void>}
     * @throws {TiltifyAPIError} if DonationMatches can't be loaded
     */
    protected async loadDonationMatches(campaignId: string, verbose: boolean = true): Promise<void> {
        // Load saved donation matches if any
        // They are saved to keep memory of which matches have previously been reached so we know what events to trigger
        const { lastDonationMatchUpdate, savedDonationMatches }: { lastDonationMatchUpdate: string, savedDonationMatches: TiltifyDonnationMatchCollection } =
            await tiltifyIntegration().loadSavedDonationMatches(campaignId);
        this.pollerData[campaignId].donationMatches = savedDonationMatches;
        this.pollerData[campaignId].lastDonationMatchUpdate = lastDonationMatchUpdate;

        // Populate info about the Matches.
        await this.updateDonationMatches(campaignId);
    }

    /**
     * Description placeholder
     *
     * @async
     * @param {string} campaignId
     * @returns {Promise<void>}
     * @throws {Error} if donations can't be updated
     */
    async updateDonations(campaignId: string): Promise<void> {
        // Load the last donation date if available
        const { lastDonationDate, ids }: {lastDonationDate: string, ids: string[]} =
            await tiltifyIntegration().loadSavedDonations(campaignId);
        this.pollerData[campaignId].lastDonationDate = lastDonationDate;
        this.pollerData[campaignId].donationIds = ids;

        let donations: TiltifyDonation[];
        try {
            // Acquire the donations since the last saved from Tiltify and sort them by date.
            donations = await tiltifyAPIController().getCampaignDonations(
                campaignId,
                new Date(new Date(this.pollerData[campaignId].lastDonationDate).getTime() + 1).toJSON()
            );
        } catch (error) {
            logger.debug("API error while updating donations. ");
            throw error;
        }

        if (donations.length > 0) {
            // update the campaign data if there have been new donations
            try {
                // A donation has happened. Reload campaign info to update collected amounts
                this.pollerData[campaignId].campaign =
                    await tiltifyAPIController().getCampaign(campaignId);
            } catch (error) {
                logger.debug("API error while updating campaign data. ");
                throw error;
            }
        } else {
            // Update donation matches if there has been no new donations this cycle
            this.updateDonationMatches(campaignId);
        }

        const sortedDonations = donations.sort(
            (a, b) =>
                Date.parse(a.completed_at ?? "") -
                Date.parse(b.completed_at ?? "")
        );

        // Process each donation
        for (const donation of sortedDonations) {
            await this.processDonation(campaignId, donation);
        }
        // Save the Ids of the events processed and the time of the last donation made
        const donationData = {
            lastDonationDate: this.pollerData[campaignId].lastDonationDate,
            ids: this.pollerData[campaignId].donationIds
        };
        tiltifyIntegration().saveDonations(campaignId, donationData);
    }

    /**
     * Description placeholder
     *
     * @async
     * @param {string} campaignId
     * @param {TiltifyDonation} donation
     * @returns {Promise<void>}
     * @throws {Error} if campaign data can't be updated
     */
    async processDonation(
        campaignId: string,
        donation: TiltifyDonation
    ): Promise<void> {
        // Don't process it if we already have registered it.
        if (this.pollerData[campaignId].donationIds.includes(donation.id)) {
            return;
        }

        // If there are reward claims, we match and update the rewards
        if (donation.reward_claims) {
            for (const rewardClaim of donation.reward_claims) {
                await this.processRewardClaim(campaignId, rewardClaim);
            }
        }

        // If there are donation matches, process them
        if (donation.donation_matches) {
            for (const donationMatch of donation.donation_matches) {
                await this.processDonationMatchUpdate(campaignId, donationMatch);
                logger.debug(`Donation of $${donation.amount?.value ?? 0} by ${donation.donor_name} matched by ${donationMatch.matched_by}. Matching until $${donationMatch.pledged_amount?.value ?? 0} or ${donationMatch.ends_at}. $${donationMatch.total_amount_raised?.value ?? 0} matched so far. `);
            }
        }
        // Donation matches that are active but don't matvch the current donation are expired
        const updatedDonationMatchIds: string[] = donation.donation_matches?.map(donationMatch => donationMatch.id) ?? [];
        const expiredDonationMatches: TiltifyDonationMatch[] = Object.values(this.pollerData[campaignId].donationMatches).filter((donationMatch) => {
            return (
                donationMatch.active &&
                !updatedDonationMatchIds.includes(donationMatch.id) &&
                Date.parse(donation.completed_at ?? "") > Date.parse(donationMatch.inserted_at)
            );
        });
        for (const expiredMatch of expiredDonationMatches) {
            // TODO: Check : If the match_type === 'all', when the match expired, is it registered as a new donation ? Or do we need to manually update the campaign ?
            expiredMatch.active = false;
            // eslint-disable-next-line camelcase
            expiredMatch.completed_at = expiredMatch.ends_at;
            // eslint-disable-next-line camelcase
            expiredMatch.updated_at = expiredMatch.ends_at;
            if (Date.parse(this.pollerData[campaignId].lastDonationMatchUpdate) < Date.parse(expiredMatch.updated_at)) {
                this.pollerData[campaignId].lastDonationMatchUpdate = expiredMatch.updated_at;
            }
            const eventDetails = {}; // TODO: Raise Match ended event
        }

        // Update the database if anything changed
        if (donation.donation_matches || expiredDonationMatches.length > 0) {
            tiltifyIntegration().saveDonationMatches(
                campaignId,
                {
                    lastDonationMatchUpdate: this.pollerData[campaignId].lastDonationMatchUpdate,
                    donationMatches: this.pollerData[campaignId].donationMatches
                }
            );
        }


        // Update the last donation date to the current one.
        this.pollerData[campaignId].lastDonationDate =
            donation.completed_at ?? "";
        logger.debug(
            `Last processed donation at : ${this.pollerData[campaignId].lastDonationDate}`
        );

        // Extract the info to populate a Firebot donation event.
        const eventDetails: TiltifyDonationEventData = new CampaignEvent(
            this.pollerData[campaignId].campaign,
            this.pollerData[campaignId].cause
        )
            .createDonationEvent(donation, donation.reward_claims !== null ? donation.reward_claims : undefined)
            .valueOf();

        logger.info(`Donation: 
From ${eventDetails.from} for $${eventDetails.donationAmount}. 
Total raised : $${eventDetails.campaignInfo.amountRaised}
Rewards: ${eventDetails.rewards.map(rewardClaim => `${rewardClaim.quantityRedeemed} * ${rewardClaim.name ?? rewardClaim.id}`).join(", ")}
Campaign : ${eventDetails.campaignInfo.name}
Cause : ${eventDetails.campaignInfo.cause}`);
        // Trigger the event
        eventManager.triggerEvent(
            TILTIFY_EVENT_SOURCE_ID,
            TILTIFY_DONATION_EVENT_ID,
            eventDetails,
            false
        );
        // Add the Id to the list of events processed
        this.pollerData[campaignId].donationIds.push(donation.id);
    }

    public async processRewardClaim(
        campaignId: string,
        rewardClaim: TiltifyRewardClaim
    ): Promise<void> {
        // Find the claimed reward in the list of known rewards
        let matchingReward: TiltifyCampaignReward | undefined = this.pollerData[
            campaignId
        ].rewards.find(ri => ri.id === rewardClaim.reward_id);

        // If I found a reward and it has a quantity limit, update the reward's remaining quantity
        if (matchingReward && matchingReward.quantity && matchingReward.quantity_remaining) {
            // eslint-disable-next-line camelcase
            matchingReward.quantity_remaining = matchingReward.quantity_remaining - (rewardClaim.quantity ?? 1);
        }

        // If we don't know the reward, reload rewards and retry.
        if (!matchingReward) {
            await this.loadRewards(campaignId, false);
            matchingReward = this.pollerData[campaignId].rewards.find(
                ri => ri.id === rewardClaim.reward_id
            );
        }

        rewardClaim.reward = matchingReward;
    }

    /**
     * Description placeholder
     *
     * @async
     * @param {string} campaignId
     * @returns {Promise<void>}
     * @throws {Error} if milestones can't be loaded or if database error
     */
    async updateMilestones(campaignId: string): Promise<void> {
        // FIXME: We appear to never reload the list of milestones from the API unless one is triggered (second timer ?)
        const savedMilestones: TiltifyMilestone[] =
            await tiltifyIntegration().loadSavedMilestones(campaignId);
        const milestoneTriggered = { value: false };
        for (const milestone of savedMilestones) {
            this.processMilestone(campaignId, milestone, milestoneTriggered);
        }
        if (milestoneTriggered.value) {
            // if we triggered a milestone, we want to silently reload the milestones from tiltify.
            await this.loadMilestones(campaignId, false);
        } else {
            this.pollerData[campaignId].milestones = savedMilestones;
            // Save the milestones
            tiltifyIntegration().saveMilestones(
                campaignId,
                this.pollerData[campaignId].milestones
            );
        }
    }

    /**
     * Description placeholder
     *
     * @param {string} campaignId
     * @param {TiltifyMilestone} milestone
     * @param {{ value: boolean }} milestoneTriggered
     */
    processMilestone(
        campaignId: string,
        milestone: TiltifyMilestone,
        milestoneTriggered: { value: boolean }
    ): void {
        // Check if milestone has been reached
        if (
            !milestone.reached &&
            Number(
                this.pollerData[campaignId].campaign?.amount_raised?.value ?? 0
            ) >= Number(milestone.amount?.value)
        ) {
            milestone.reached = true;
            milestoneTriggered.value = true;
            // Extract the info to populate a Firebot milestone event.
            const eventDetails: TiltifyMilestoneReachedEventData =
                new CampaignEvent(
                    this.pollerData[campaignId].campaign,
                    this.pollerData[campaignId].cause
                )
                    .createMilestoneEvent(milestone)
                    .valueOf();

            logger.info(`Milestone ${eventDetails.name} reached. 
Target amount : $${eventDetails.amount}
Reached amount: $${eventDetails.campaignInfo.amountRaised}
Campaign: ${eventDetails.campaignInfo.name}
Cause: ${eventDetails.campaignInfo.cause}`);
            // Trigger the event
            eventManager.triggerEvent(
                TILTIFY_EVENT_SOURCE_ID,
                TILTIFY_MILESTONE_EVENT_ID,
                eventDetails,
                false
            );
        }
    }

    /**
     * Look for updates of the donation Matches when we aren't receiving new donations
     *
     * @async
     * @param {string} campaignId
     * @returns {Promise<void>}
     * @throws {Error} if donation matches can't be updated
     */
    async updateDonationMatches(campaignId: string): Promise<void> {
        // This is gonna update to reflect the completion and possibly new Matches.
        try {
            const lastDonationMatchUpdate: string = this.pollerData[campaignId].lastDonationMatchUpdate;
            let donationMatchUpdates: TiltifyDonationMatch[] =
                await tiltifyAPIController().getDonationMatches(
                    campaignId,
                    lastDonationMatchUpdate !== "" ? new Date(new Date(lastDonationMatchUpdate).getTime() + 1).toJSON() : undefined
                );
            // FIXME : It appears updated_at lies and we can't rely on it to specify updated_after parameter to the API. 

            donationMatchUpdates = donationMatchUpdates.sort(
                (a, b) =>
                    Date.parse(a.updated_at ?? "") -
                    Date.parse(b.updated_at ?? "")
            );

            for (const donationMatchUpdate of donationMatchUpdates) {
                await this.processDonationMatchUpdate(campaignId, donationMatchUpdate);
            }

            // Update the database if anything changed
            if (donationMatchUpdates.length > 0) {
                tiltifyIntegration().saveDonationMatches(
                    campaignId,
                    {
                        lastDonationMatchUpdate: this.pollerData[campaignId].lastDonationMatchUpdate,
                        donationMatches: this.pollerData[campaignId].donationMatches
                    }
                );
            }
        } catch (error) {
            logger.warn(
                `Information about Donation Matches for ${campaignId} couldn't be retrieved or are invalid. Message: ${error.message}`
            );
            throw error;
        }
    }

    /**
     * Process a donation match update that has been received either from a dobnation of from an independant update. 
     *
     * @async
     * @param {string} campaignId
     * @returns {Promise<void>}
     * @throws {Error} if donation matches can't be processed
     */
    async processDonationMatchUpdate(campaignId: string, donationMatchUpdate: TiltifyDonationMatch): Promise<void> {
        if (donationMatchUpdate.id in this.pollerData[campaignId].donationMatches) {
            // It's an update to an existing donation match
            const savedDonationMatch: TiltifyDonationMatch = this.pollerData[campaignId].donationMatches[donationMatchUpdate.id];
            if (savedDonationMatch.active && !donationMatchUpdate.active) {
                // The donation match completed
                const eventDetails = {}; // TODO: Raise match completed event
                // TODO: Check if we receive a donation and it completes the donation match, is this true, or do we need a new condition ?
            } else if (!savedDonationMatch.active && donationMatchUpdate.active) {
                // The donation match started
                const eventDetails = {}; // Todo: Raise Match started event
            }
        } else {
            // It's a previously unknown match
            if (donationMatchUpdate.active) {
                // The donation match started
                const eventDetails = {}; // Todo: Raise Match started event
            } else if (donationMatchUpdate.completed_at !== null) {
                // The donation match started and ended
                const eventDetails = {}; // Todo: Raise match ended event or raise match started and ended event or ignore it ?
            }
        }
        // Update the poller data
        this.pollerData[campaignId].lastDonationMatchUpdate = donationMatchUpdate.updated_at;
        this.pollerData[campaignId].donationMatches[donationMatchUpdate.id] = donationMatchUpdate;
    }

    public checkIfIntegrationDisconnected(): void {
        let isConnected: boolean = false;
        for (const campaignId of Object.keys(this.pollerStarted)) {
            if (this.pollerStarted[campaignId] === true) {
                isConnected = true;
            }
        }
        if (isConnected === false && tiltifyIntegration().connected === true) {
            logger.debug(`All pollers have been stopped. Disconnecting from Tiltify service.`);
            tiltifyIntegration().connected = false;
            logger.info("Tiltify Disconnected.");
            tiltifyIntegration().emit("disconnected", TILTIFY_INTEGRATION_ID);
        }
    }
}

/**
 * Description placeholder
 *
 * @type {typeof TiltifyPollService.instance}
 */
export const tiltifyPollService: typeof TiltifyPollService.instance =
    TiltifyPollService.instance.bind(TiltifyPollService);
