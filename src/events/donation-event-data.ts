import { TILTIFY_DONATION_EVENT_ID } from "@/constants";
import { FirebotEvent } from "@/@types/firebot-events";

import { TiltifyDonation } from "@/types/donation";
import { TiltifyRewardClaim } from "@/types/campaign-reward";
import { TiltifyCampaign } from "@/types/campaign";
import { TiltifyCause } from "@/types/cause";

import {
    CampaignEvent,
    TiltifyCampaignEventData,
    getManualMetadata as getCampaignManualMetadata
} from "./campaign-event-data";
import { TiltifyDonationMatchData } from "./donation-match-event-data";


export type TiltifyRewardClaimEventData = {
    id: string;
    name: string;
    quantityAvailable: number | null;
    quantityRedeemed: number;
    quantityRemaining: number | null;
    cost: number;
    description: string;
};

export type TiltifyDonationEventData = TiltifyCampaignEventData & {
    from: string;
    donationAmount: number;
    rewards: TiltifyRewardClaimEventData[];
    matches: TiltifyDonationMatchData[];
    comment: string;
    pollOptionId: string;
    challengeId: string;
};

const getManualMetadata: TiltifyDonationEventData = {
    ...getCampaignManualMetadata,
    from: "Tiltify",
    donationAmount: 4.2,
    rewards: [
        {
            id: "",
            name: "Default reward",
            quantityAvailable: 10,
            quantityRedeemed: 1,
            quantityRemaining: 5,
            cost: 5,
            description: "This is a dummy reward"
        }
    ],
    matches: [],
    comment: "Thanks for the stream!",
    pollOptionId: "",
    challengeId: ""
};

function getMessage(eventData: TiltifyDonationEventData) {
    return `**${eventData.from}** donated **$${eventData.donationAmount}** to ${eventData.campaignInfo.name}${
        eventData.matches.length === 0 ? "" :
            ` matched x${eventData.matches.length + 1}`
    }${
        eventData.rewards.length === 0 ? "" :
            eventData.rewards.length === 1 && eventData.rewards[0].quantityRedeemed <= 1 ?
                ` with reward *${eventData.rewards[0].name ? eventData.rewards[0].name : eventData.rewards[0].id}*` :
                ` with rewards ${eventData.rewards.map(rewardClaim =>
                    `${rewardClaim.quantityRedeemed <= 1 ? '' : `${rewardClaim.quantityRedeemed} x `}*${rewardClaim.name ? rewardClaim.name : rewardClaim.id}*`
                ).join(', ')}`
    }`;
}

export const TiltifyDonationEvent: FirebotEvent = {
    id: TILTIFY_DONATION_EVENT_ID,
    name: "Donation",
    description: "When someone donates to you via Tiltify.",
    cached: false,
    manualMetadata: getManualMetadata,
    //@ts-ignore
    isIntegration: true,
    queued: true,
    activityFeed: {
        icon: "fad fa-heart",
        getMessage: getMessage
    }
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
                    quantityAvailable: rewardClaim.reward?.quantity ?? null,
                    quantityRedeemed: rewardClaim.quantity ?? 1,
                    quantityRemaining: rewardClaim.reward?.quantity_remaining ?? null,
                    cost: Number(rewardClaim.reward?.amount?.value ?? 0),
                    description: rewardClaim.reward?.description ?? ""
                };
                return rewardClaimEventData;
            }) ?? [],
            matches: donationData?.donation_matches?.map<TiltifyDonationMatchData>((match) => {
                const matchData: TiltifyDonationMatchData = {
                    matchedBy: match.matched_by,
                    pledgedAmount: Number(match.pledged_amount?.value ?? 0),
                    amountMatched: Number(match.total_amount_raised?.value ?? 0),
                    endsAtTimestamp: new Date(match.ends_at).getTime() / 1000,
                    remainingTime: match.active ? (new Date(match.ends_at).getTime() - new Date().getTime()) / 1000 : 0
                };
                return matchData;
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
