import { TiltifyDonation } from "@/types/donation";
import { TiltifyCampaignEventData } from "./campaign-event-data";
import { TiltifyCampaignReward } from "@/types/campaign-reward";

export type TiltifyDonationEventData = TiltifyCampaignEventData & {
    from: string;
    donationAmount: number;
    rewardId: string;
    rewardName: string;
    comment: string;
    pollOptionId: string;
    challengeId: string;
};

export function createDonationEvent(
    campaignEvent: TiltifyCampaignEventData,
    donation: TiltifyDonation,
    matchingreward: TiltifyCampaignReward = null
): TiltifyDonationEventData {
    const eventDetails = campaignEvent as TiltifyDonationEventData;
    eventDetails.from = donation.donor_name;
    eventDetails.donationAmount = Number(donation.amount.value);
    eventDetails.rewardId = donation.reward_id;
    eventDetails.rewardName = matchingreward?.name ?? "";
    eventDetails.comment = donation.donor_comment;
    eventDetails.pollOptionId = donation.poll_option_id;
    eventDetails.challengeId = donation.target_id;
    return eventDetails;
}
