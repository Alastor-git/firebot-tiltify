import { TiltifyDonation } from "@/types/donation";
import { CampaignEvent, TiltifyCampaignEventData } from "./campaign-event-data";
import { TiltifyCampaignReward } from "@/types/campaign-reward";
import { TiltifyCampaign } from "@/types/campaign";
import { TiltifyCause } from "@/types/cause";

export type TiltifyDonationEventData = TiltifyCampaignEventData & {
    from: string;
    donationAmount: number;
    rewardId: string;
    rewardName: string;
    comment: string;
    pollOptionId: string;
    challengeId: string;
};

export class DonationEvent {
    data: TiltifyDonationEventData;

    constructor();
    constructor(
        donationData: TiltifyDonation,
        matchingRewardData?: TiltifyCampaignReward
    );
    constructor(
        donationData: TiltifyDonation,
        matchingRewardData: TiltifyCampaignReward | undefined,
        campaignData: TiltifyCampaign,
        causeData?: TiltifyCause
    );
    constructor(
        donationData: TiltifyDonation,
        matchingRewardData: TiltifyCampaignReward | undefined,
        campaignData: CampaignEvent
    );
    constructor(
        donationData?: TiltifyDonation,
        matchingRewardData?: TiltifyCampaignReward,
        campaignData?: TiltifyCampaign | CampaignEvent,
        causeData?: TiltifyCause
    ) {
        let campaignEvent: CampaignEvent;
        if (campaignData instanceof CampaignEvent) {
            campaignEvent = campaignData;
        } else {
            campaignEvent = new CampaignEvent(campaignData, causeData);
        }
        this.data = {
            ...campaignEvent.valueOf(),
            from: donationData?.donor_name ?? "",
            donationAmount: Number(donationData?.amount?.value ?? 0),
            rewardId: donationData?.reward_id ?? "",
            rewardName: matchingRewardData?.name ?? "",
            comment: donationData?.donor_comment ?? "",
            pollOptionId: donationData?.poll_option_id ?? "",
            challengeId: donationData?.target_id ?? ""
        };
    }

    valueOf(): TiltifyDonationEventData {
        return this.data;
    }
}

declare module "./campaign-event-data" {
    interface CampaignEvent {
        createDonationEvent(
            donation: TiltifyDonation,
            matchingReward: TiltifyCampaignReward | undefined
        ): DonationEvent;
    }
}

CampaignEvent.prototype.createDonationEvent = function (
    donation: TiltifyDonation,
    matchingReward: TiltifyCampaignReward | undefined = undefined
): DonationEvent {
    return new DonationEvent(donation, matchingReward, this as CampaignEvent);
};
