import { AbstractPollService } from "./poll-service";
import {
    logger,
    integrationManager,
    eventManager
} from "@shared/firebot-modules";

import { TiltifyCampaignData } from "./types/campaign-data";
import { TiltifyMilestone } from "./types/milestone";
import {
    fetchRewards,
    getCampaign,
    getCause,
    getCampaignDonations,
    getMilestones
} from "./tiltify-remote";
import { TiltifyCampaignReward } from "./types/campaign-reward";
import {
    TILTIFY_DONATION_EVENT_ID,
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_MILESTONE_EVENT_ID
} from "./constants";

import { TiltifyIntegration, TiltifySettings } from "./tiltify-integration";

import "./events/donation-event-data"; // Solves module augmentation is not loaded
import { TiltifyDonationEventData } from "./events/donation-event-data";
import "./events/milestone-reached-event-data"; // Solves module augmentation is not loaded
import { TiltifyMilestoneReachedEventData } from "./events/milestone-reached-event-data";
import { TiltifyDonation } from "./types/donation";
import { CampaignEvent } from "./events/campaign-event-data";

class TiltifyPollService extends AbstractPollService {
    private integrationController: TiltifyIntegration;
    declare protected pollerData: { [campaignId: string]: TiltifyCampaignData };
    declare protected pollerStarted: { [campaignId: string]: boolean };

    protected async startPollActions(campaignId: string) {
        // TODO: Include here the actions you need to do only once before the poll starts

        // Load the integrationcontroller if it hasen't been
        if (!this.integrationController) {
            this.integrationController =
                integrationManager.getIntegrationById<TiltifySettings>(
                    "tiltify"
                ).integration as TiltifyIntegration;
        }

        // Initiate the poller's data
        this.pollerData[campaignId] = {
            campaignId: campaignId,
            cause: null,
            campaign: null,
            milestones: [],
            rewards: [],
            lastDonationDate: null,
            donationIds: []
        };
        // Populate the poller's data

        // Load info about the campaign.
        // If impossible, disconnect the campaign
        const campaignLoaded = await this.loadCampaign(campaignId);
        if (!campaignLoaded) {
            logger.debug(
                `Tiltify : information about campaign ${campaignId} couldn't be retrieved or are invalid. `
            );
            logger.debug("Tiltify : Disconnecting Tiltify.");
            this.pollerStarted[campaignId] = false;
            return;
        }

        await this.loadCause(campaignId);
        await this.loadRewards(campaignId);
        await this.loadMilestones(campaignId);
    }

    protected async poll(campaignId: string) {
        // TODO : Poll here the data from Tiltify

        // FIXME: If connexion fails, we should stop the poller
        // FIXME: Error handling. What happens if token dies or Promise otherwise rejected ?
        // FIXME: Auto reconnecting if disconnected ? How does Firebot handle this ?

        // Check for new donations
        await this.updateDonations(campaignId);

        // Check for milestones reached
        await this.updateMilestones(campaignId);
    }

    protected stopPollActions(campaignId: string) {
        // TODO : Include here the actions you need to do only once after the poll ends
    }

    async loadCampaign(campaignId: string): Promise<boolean> {
        // Populate information about the campaign. This is mandatory to have. If not, we have a problem.
        // This contains the money raised, so it will update

        // Get the saved access token
        const authData = await this.integrationController.getAuth();
        const token = authData?.access_token;
        // Check we managed to get a valid token
        if (!token) {
            return false;
        }

        // Load the campaign data
        this.pollerData[campaignId].campaign = await getCampaign(
            token,
            campaignId
        );

        // Check that the campaign data is valid
        const causeId = this.pollerData[campaignId].campaign?.cause_id;
        if (causeId == null || causeId === "") {
            return false;
        }
        return true;
    }

    async loadCause(campaignId: string) {
        // Populate info about the cause the campaign is collecting for. This should not change

        // Get the saved access token
        const authData = await this.integrationController.getAuth();
        const token = authData?.access_token;

        // Collect data about the cause
        this.pollerData[campaignId].cause = await getCause(
            token,
            this.pollerData[campaignId].campaign.cause_id
        );
    }

    async loadMilestones(campaignId: string, verbose = true) {
        // Populate info about the Milestones.
        // This is gonna update to reflect the activation and possible new Milestones.

        // Get the saved access token
        const authData = await this.integrationController.getAuth();
        const token = authData?.access_token;

        this.pollerData[campaignId].milestones = await getMilestones(
            token,
            campaignId
        );
        // Load saved milestones if any
        // They are saved to keep memory of which milestones have previously been reached so we know what events to trigger
        const savedMilestones: TiltifyMilestone[] =
            await this.integrationController.loadMilestones(campaignId);

        this.pollerData[campaignId].milestones.forEach(
            (milestone: TiltifyMilestone) => {
                // Check if loaded milestone has been reached
                milestone.reached =
                    Number(
                        this.pollerData[campaignId].campaign?.amount_raised
                            ?.value ?? 0
                    ) >= Number(milestone.amount.value);
                // Checked the saved value for the milestone
                const savedMilestone: TiltifyMilestone = savedMilestones.find(
                    (mi: TiltifyMilestone) => mi.id === milestone.id
                );
                // If the milestone was unknown
                if (!savedMilestone) {
                    // Set reached as false so the event triggers
                    milestone.reached = false;
                    logger.debug(
                        `Tiltify: Campaign Milestone ${milestone.name} is new. `
                    );
                } else if (milestone.reached && !savedMilestone.reached) {
                    // If the saved milestone was unreached, we want to make sure that if it's currently reached, we trip the event too
                    milestone.reached = false;
                    logger.debug(
                        `Tiltify: Campaign Milestone ${milestone.name} is has been reached while Tiltify was offline. Ensuring the event triggers. `
                    );
                }
            },
            this
        );
        // Save the loaded milestones
        this.integrationController.saveMilestones(
            campaignId,
            this.pollerData[campaignId].milestones
        );
        // Log the new Milestones state
        if (verbose) {
            logger.debug(
                "Tiltify: Campaign Milestones: ",
                this.pollerData[campaignId].milestones
                    .map(
                        mi => `
ID: ${mi.id}
Name: ${mi.name}
Amount: $${mi.amount.value}
Active: ${mi.active}
Reached: ${mi.reached}`
                    )
                    .join("\n")
            );
        }
    }

    async loadRewards(campaignId: string, verbose = true) {
        // Populate info about the rewards offered.
        // This is gonna update to reflect the quantities available and offered and possible new rewards.

        // Get the saved access token
        const authData = await this.integrationController.getAuth();
        const token = authData?.access_token;

        this.pollerData[campaignId].rewards = await fetchRewards(
            token,
            campaignId
        );
        if (verbose) {
            logger.debug(
                "Tiltify: Campaign Rewards: ",
                this.pollerData[campaignId].rewards
                    .map(
                        re => `
ID: ${re.id}
Name: ${re.name}
Amount: $${re.amount.value}
Active: ${re.active}`
                    )
                    .join("\n")
            );
        }
    }

    async updateDonations(campaignId: string) {
        // Get the saved access token
        const authData = await this.integrationController.getAuth();
        const token = authData?.access_token;

        // Load the last donation date if available
        const { lastDonationDate, ids } =
            await this.integrationController.loadDonations(campaignId);
        this.pollerData[campaignId].lastDonationDate = lastDonationDate;
        this.pollerData[campaignId].donationIds = ids;

        // Acquire the donations since the last saved from Tiltify and sort them by date.
        const donations = await getCampaignDonations(
            token,
            campaignId,
            this.pollerData[campaignId].lastDonationDate
        );
        const sortedDonations = donations.sort(
            (a, b) => Date.parse(a.completed_at) - Date.parse(b.completed_at)
        );

        // Process each donation
        // FIXME : Technically, foreach isn't supposed to take an async function, but that's necessary to be able to await inside. What to do ?
        sortedDonations.forEach(async (donation) => {
            await this.processDonation(campaignId, donation);
        }, this);
        // Save the Ids of the events processed and the time of the last donation made
        const donationData = {
            lastDonationDate: this.pollerData[campaignId].lastDonationDate,
            ids: this.pollerData[campaignId].donationIds
        };
        this.integrationController.saveDonations(campaignId, donationData);
    }

    async processDonation(campaignId: string, donation: TiltifyDonation) {
        // Don't process it if we already have registered it.
        if (this.pollerData[campaignId].donationIds.includes(donation.id)) {
            return;
        }

        // Get the saved access token
        const authData = await this.integrationController.getAuth();
        const token = authData?.access_token;
        // A donation has happened. Reload campaign info to update collected amounts
        this.pollerData[campaignId].campaign = await getCampaign(
            token,
            campaignId
        );
        // If we don't know the reward, reload rewards and retry.
        let matchingreward: TiltifyCampaignReward = this.pollerData[
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
        this.pollerData[campaignId].lastDonationDate = donation.completed_at;

        // Extract the info to populate a Firebot donation event.
        const eventDetails: TiltifyDonationEventData = new CampaignEvent(
            this.pollerData[campaignId].campaign,
            this.pollerData[campaignId].cause
        )
            .createDonationEvent(donation, matchingreward)
            .valueOf();

        logger.info(`Tiltify : 
Donation from ${eventDetails.from} for $${eventDetails.donationAmount}. 
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

    async updateMilestones(campaignId: string) {
        const savedMilestones: TiltifyMilestone[] =
            await this.integrationController.loadMilestones(campaignId);
        const milestoneTriggered = { value: false };
        savedMilestones.forEach(
            milestone =>
                this.processMilestone(
                    campaignId,
                    milestone,
                    milestoneTriggered
                ),
            this
        );
        if (milestoneTriggered.value) {
            // if we triggered a milestone, we want to silently reload the milestones from tiltify.
            await this.loadMilestones(campaignId, false);
        } else {
            this.pollerData[campaignId].milestones = savedMilestones;
            // Save the milestones
            this.integrationController.saveMilestones(
                campaignId,
                this.pollerData[campaignId].milestones
            );
        }
    }

    processMilestone(
        campaignId: string,
        milestone: TiltifyMilestone,
        milestoneTriggered: { value: boolean }
    ) {
        // Check if milestone has been reached
        if (
            !milestone.reached &&
            Number(
                this.pollerData[campaignId].campaign?.amount_raised?.value ?? 0
            ) >= Number(milestone.amount.value)
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

            logger.info(`Tiltify : 
Milestone ${eventDetails.name} reached. 
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

export const tiltifyPollService = new TiltifyPollService();
