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
import { TiltifyCampaignReward } from "@/types/campaign-reward";
import {
    TILTIFY_DONATION_EVENT_ID,
    TILTIFY_EVENT_SOURCE_ID,
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
    private static _instance: TiltifyPollService; // eslint-disable-line no-use-before-define

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

        // FIXME: Auto reconnecting if disconnected ? How does Firebot handle this ?

        try {
            // Check for new donations
            await this.updateDonations(campaignId);

            // Check for milestones reached
            await this.updateMilestones(campaignId);
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
     * @param {string} campaignId 
     */
    protected stopPollActions(campaignId: string): void {
        // TODO : Include here the actions you need to do only once after the poll ends
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
     * @throws {Error} if milestones can't be loaded
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
            throw new Error("Milestones not loaded", { cause: error });
        }
        // Load saved milestones if any
        // They are saved to keep memory of which milestones have previously been reached so we know what events to trigger
        const savedMilestones: TiltifyMilestone[] =
            await tiltifyIntegration().loadMilestones(campaignId);

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
     * @throws {Error} if rewards can't be loaded
     */
    async loadRewards(campaignId: string, verbose = true): Promise<void> {
        // Populate info about the rewards offered.
        // This is gonna update to reflect the quantities available and offered and possible new rewards.

        try {
            this.pollerData[campaignId].rewards =
                await tiltifyAPIController().getRewards(campaignId);
        } catch (error) {
            logger.warn(
                `Information about Rewards for ${campaignId} couldn't be retrieved or are invalid. Message: ${error.message}`
            );
            throw new Error("Rewards not loaded", { cause: error });
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
     * Description placeholder
     *
     * @async
     * @param {string} campaignId
     * @returns {Promise<void>}
     * @throws {Error} if donations can't be updated
     */
    async updateDonations(campaignId: string): Promise<void> {
        // Load the last donation date if available
        const { lastDonationDate, ids } =
            await tiltifyIntegration().loadDonations(campaignId);
        this.pollerData[campaignId].lastDonationDate = lastDonationDate;
        this.pollerData[campaignId].donationIds = ids;

        let donations: TiltifyDonation[];
        try {
            // Acquire the donations since the last saved from Tiltify and sort them by date.
            donations = await tiltifyAPIController().getCampaignDonations(
                campaignId,
                this.pollerData[campaignId].lastDonationDate
            );
        } catch (error) {
            throw new Error("API error while updating donations. ", {
                cause: error
            });
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

        try {
            // A donation has happened. Reload campaign info to update collected amounts
            // FIXME: Campaign should only be reloaded once if there are new donations rather than once per donation
            this.pollerData[campaignId].campaign =
                await tiltifyAPIController().getCampaign(campaignId);
        } catch (error) {
            throw new Error("Tiltify: API error while updating campaign data", {
                cause: error
            });
        }
        // If we don't know the reward, reload rewards and retry.
        let matchingreward: TiltifyCampaignReward | undefined = this.pollerData[
            campaignId
        ].rewards.find(ri => ri.id === donation.reward_id);
        if (!matchingreward) {
            await this.loadRewards(campaignId, false);
            matchingreward = this.pollerData[campaignId].rewards.find(
                ri => ri.id === donation.reward_id
            );
        }
        // FIXME : Rewards contain info about quantity remaining. We should update that when a donation comes in claiming a reward.

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
            .createDonationEvent(donation, matchingreward)
            .valueOf();

        logger.info(`Donation: 
From ${eventDetails.from} for $${eventDetails.donationAmount}. 
Total raised : $${eventDetails.campaignInfo.amountRaised}
Reward: ${eventDetails.rewardName ?? eventDetails.rewardId}
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

    /**
     * Description placeholder
     *
     * @async
     * @param {string} campaignId
     * @returns {Promise<void>}
     * @throws {Error} if milestones can't be loaded or if database error
     */
    async updateMilestones(campaignId: string): Promise<void> {
        const savedMilestones: TiltifyMilestone[] =
            await tiltifyIntegration().loadMilestones(campaignId);
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
}

/**
 * Description placeholder
 *
 * @type {typeof TiltifyPollService.instance}
 */
export const tiltifyPollService: typeof TiltifyPollService.instance =
    TiltifyPollService.instance.bind(TiltifyPollService);
