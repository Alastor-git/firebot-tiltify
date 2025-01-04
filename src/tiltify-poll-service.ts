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

import { TiltifyDonationEventData } from "./events/donation-event-data";
import { TiltifyMilestoneReachedEventData } from "./events/milestone-reached-event-data";

class TiltifyPollService extends AbstractPollService {
    private integrationController: TiltifyIntegration;
    declare protected pollerData: { [campaignId: string]: TiltifyCampaignData };
    declare protected pollerStarted: { [campaignId: string]: boolean };

    constructor() {
        super();
        this.integrationController =
            integrationManager.getIntegrationById<TiltifySettings>("tiltify")
                .integration as TiltifyIntegration;
    }

    protected async startPollActions(campaignId: string) {
        /* TODO: Include here the actions you need to do only once before the poll starts */

        // Get the saved access token
        const authData = await this.integrationController.getAuth();
        const token = authData.access_token;
        this.pollerData[campaignId] = {
            campaignId: campaignId,
            cause: null,
            campaign: null,
            milestones: [],
            rewards: []
        };

        // Populate information about the campaign. This is mandatory to have. If not, we have a problem.
        // This contains the money raised, so it will update
        this.pollerData[campaignId].campaign = await getCampaign(
            token,
            campaignId
        );
        if (
            this.pollerData[campaignId].campaign?.cause_id == null ||
            this.pollerData[campaignId].campaign.cause_id === ""
        ) {
            logger.debug(
                `Tiltify : information about campaign ${campaignId} couldn't be retrieved or are invalid. `
            );
            logger.debug("Tiltify : Disconnecting Tiltify.");
            this.pollerStarted[campaignId] = false;
            return;
        }

        // Populate info about the cause the campaign is collecting for. This should not change
        this.pollerData[campaignId].cause = await getCause(
            token,
            this.pollerData[campaignId].campaign.cause_id
        );
        // Populate info about the rewards offered.
        // This is gonna update to reflect the quantities available and offered and possible new rewards.
        this.pollerData[campaignId].rewards = await fetchRewards(
            token,
            campaignId
        );
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

        // Populate info about the Milestones.
        // This is gonna update to reflect the activation and possible new Milestones.
        this.pollerData[campaignId].milestones = await getMilestones(
            token,
            campaignId
        );
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
            }
        );
        this.integrationController.saveMilestones(
            campaignId,
            this.pollerData[campaignId].milestones
        );
        /* TODO: End of Start actions */
    }

    protected async poll(campaignId: string) {
        /* TODO : Poll here the data from Tiltify */
        // Get the saved access token
        const authData = await this.integrationController.getAuth();
        const token = authData.access_token;

        // Load the last donation date if available
        let { lastDonationDate, ids } =
            await this.integrationController.loadDonations(campaignId);

        // Acquire the donations since the last saved from Tiltify and sort them by date.
        const donations = await getCampaignDonations(
            token,
            campaignId,
            lastDonationDate
        );
        const sortedDonations = donations.sort(
            (a, b) => Date.parse(a.completed_at) - Date.parse(b.completed_at)
        );

        // Process each donation
        // FIXME : Technically, foreach isn't supposed to take an async function, but that's necessary to be able to await inside. What to do ?
        sortedDonations.forEach(async (donation) => {
            // Don't process it if we already have registered it.
            if (ids.includes(donation.id)) {
                return;
            }

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
                this.pollerData[campaignId].rewards = await fetchRewards(
                    token,
                    campaignId
                );
                matchingreward = this.pollerData[campaignId].rewards.find(
                    ri => ri.id === donation.reward_id
                );
            }
            // FIXME : Rewards contain info about quantity remaining. We should update that when a donation comes in claiming a reward.

            // Update the last donation date to the current one.
            lastDonationDate = donation.completed_at;

            // Extract the info to populate a Firebot donation event.
            const eventDetails: TiltifyDonationEventData = {
                from: donation.donor_name,
                donationAmount: Number(donation.amount.value),
                rewardId: donation.reward_id,
                rewardName: matchingreward?.name ?? "",
                comment: donation.donor_comment,
                pollOptionId: donation.poll_option_id,
                challengeId: donation.target_id,
                campaignInfo: {
                    name: this.pollerData[campaignId].campaign?.name,
                    cause: this.pollerData[campaignId].cause?.name,
                    causeLegalName: this.pollerData[campaignId].cause?.name,
                    fundraisingGoal: Number(
                        this.pollerData[campaignId].campaign?.goal?.value ?? 0
                    ),
                    originalGoal: Number(
                        this.pollerData[campaignId].campaign?.original_goal
                            ?.value ?? 0
                    ),
                    supportingRaised:
                        Number(
                            this.pollerData[campaignId].campaign
                                ?.total_amount_raised?.value ?? 0
                        ) -
                        Number(
                            this.pollerData[campaignId].campaign?.amount_raised
                                ?.value ?? 0
                        ),
                    amountRaised: Number(
                        this.pollerData[campaignId].campaign?.amount_raised
                            ?.value ?? 0
                    ),
                    totalRaised: Number(
                        this.pollerData[campaignId].campaign
                            ?.total_amount_raised?.value ?? 0
                    )
                }
            };
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
            ids.push(donation.id);
        });
        // Save the Ids of the events processed and the time of the last donation made
        this.integrationController.saveDonations(campaignId, {
            lastDonationDate,
            ids
        });

        // Check for milestones reached
        const savedMilestones: TiltifyMilestone[] =
            await this.integrationController.loadMilestones(campaignId);
        let milestoneTriggered = false;
        // FIXME : Technically, foreach isn't supposed to take an async function, but that's necessary to be able to await inside. What to do ?
        savedMilestones.forEach((milestone: TiltifyMilestone) => {
            // Check if milestone has been reached
            if (
                !milestone.reached &&
                Number(
                    this.pollerData[campaignId].campaign?.amount_raised
                        ?.value ?? 0
                ) >= Number(milestone.amount.value)
            ) {
                milestone.reached = true;
                milestoneTriggered = true;
                // Extract the info to populate a Firebot milestone event.
                const eventDetails: TiltifyMilestoneReachedEventData = {
                    id: milestone.id,
                    name: milestone.name,
                    amount: Number(milestone.amount.value),
                    campaignInfo: {
                        name: this.pollerData[campaignId].campaign?.name,
                        cause: this.pollerData[campaignId].cause?.name,
                        causeLegalName: this.pollerData[campaignId].cause?.name,
                        fundraisingGoal: Number(
                            this.pollerData[campaignId].campaign?.goal?.value ??
                                0
                        ),
                        originalGoal: Number(
                            this.pollerData[campaignId].campaign?.original_goal
                                ?.value ?? 0
                        ),
                        supportingRaised:
                            Number(
                                this.pollerData[campaignId].campaign
                                    ?.total_amount_raised?.value ?? 0
                            ) -
                            Number(
                                this.pollerData[campaignId].campaign
                                    ?.amount_raised?.value ?? 0
                            ),
                        amountRaised: Number(
                            this.pollerData[campaignId].campaign?.amount_raised
                                ?.value ?? 0
                        ),
                        totalRaised: Number(
                            this.pollerData[campaignId].campaign
                                ?.total_amount_raised?.value ?? 0
                        )
                    }
                };
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
        });
        if (milestoneTriggered) {
            // if we triggered a milestone, we want to reload the milestones from tiltify.
            this.pollerData[campaignId].milestones = await getMilestones(
                token,
                campaignId
            );
            this.pollerData[campaignId].milestones.forEach(
                (milestone: TiltifyMilestone) => {
                    // Check if loaded milestone has been reached
                    milestone.reached =
                        Number(
                            this.pollerData[campaignId].campaign?.amount_raised
                                ?.value ?? 0
                        ) >= Number(milestone.amount.value);
                    // Checked the saved value for the milestone
                    const savedMilestone: TiltifyMilestone =
                        savedMilestones.find(
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
                            `Tiltify: Campaign Milestone ${milestone.name} has updated and isn't reached anymore. Ensuring the event triggers. `
                        );
                    }
                }
            );
        } else {
            this.pollerData[campaignId].milestones = savedMilestones;
        }
        // Save the milestones
        this.integrationController.saveMilestones(
            campaignId,
            this.pollerData[campaignId].milestones
        );
        /* TODO : End of Poll action */
    }

    protected stopPollActions(campaignId: string) {
        /* TODO : Include here the actions you need to do only once after the poll ends */
    }
}
export const tiltifyPollService = new TiltifyPollService();
