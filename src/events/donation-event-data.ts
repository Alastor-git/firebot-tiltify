import { TiltifyDonation } from "@/types/donation";
import { CampaignEvent, TiltifyCampaignEventData } from "./campaign-event-data";
import { TiltifyRewardClaim } from "@/types/campaign-reward";
import { TiltifyCampaign } from "@/types/campaign";
import { TiltifyCause } from "@/types/cause";

export type TiltifyRewardClaimEventData = {
    id: string;
    name: string;
    quantity: number;
    cost: number;
    description: string;
};

export type TiltifyDonationEventData = TiltifyCampaignEventData & {
    from: string;
    donationAmount: number;
    rewards: TiltifyRewardClaimEventData[];
    comment: string;
    pollOptionId: string;
    challengeId: string;
};

export class DonationEvent {
    data: TiltifyDonationEventData;

    constructor();
    constructor(
        donationData: TiltifyDonation,
        rewardClaimsData?: TiltifyRewardClaim[]
    );
    constructor(
        donationData: TiltifyDonation,
        rewardClaimsData: TiltifyRewardClaim[] | undefined,
        campaignData: TiltifyCampaign,
        causeData?: TiltifyCause
    );
    constructor(
        donationData: TiltifyDonation,
        rewardClaimsData: TiltifyRewardClaim[] | undefined,
        campaignData: CampaignEvent
    );
    constructor(
        donationData?: TiltifyDonation,
        rewardClaimsData?: TiltifyRewardClaim[],
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
            rewards: rewardClaimsData?.map<TiltifyRewardClaimEventData>((rewardClaim) => {
                const rewardClaimEventData: TiltifyRewardClaimEventData = {
                    id: rewardClaim.reward?.id ?? "",
                    name: rewardClaim.reward?.name ?? "",
                    quantity: rewardClaim.quantity ?? 1,
                    cost: Number(rewardClaim.reward?.amount?.value ?? 0),
                    description: rewardClaim.reward?.description ?? ""
                };
                return rewardClaimEventData;
            }) ?? [],
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
            rewardClaims: TiltifyRewardClaim[] | undefined
        ): DonationEvent;
    }
}

CampaignEvent.prototype.createDonationEvent = function (
    donation: TiltifyDonation,
    rewardClaims: TiltifyRewardClaim[] | undefined = undefined
): DonationEvent {
    return new DonationEvent(donation, rewardClaims, this as CampaignEvent);
};
