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
    matchMultiplier: number;
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
    matchMultiplier: 1,
    comment: "Thanks for the stream!",
    pollOptionId: "",
    challengeId: ""
};

function getMessage(eventData: TiltifyDonationEventData) {
    return `**${eventData.from}** donated **$${eventData.donationAmount}** to ${eventData.campaignInfo.name}${
        eventData.matchMultiplier === 1 ? "" : ` matched x${eventData.matchMultiplier}`
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
                // hasExpired refers to the time remaining when the donation was made. If it expired, ends_at === completed_at
                const nowTimestamp: number = donationData.completed_at ? new Date(donationData.completed_at).getTime() : new Date().getTime();
                const endTimestamp: number = new Date(match.ends_at).getTime();
                const amountPledged: number = Number(match.pledged_amount?.value ?? 0);
                const amountMatched: number = Number(match.total_amount_raised?.value ?? 0);
                const matchData: TiltifyDonationMatchData = {
                    id: match.id,
                    matchedBy: match.matched_by,
                    amountPledged: amountPledged,
                    amountMatched: amountMatched,
                    endTimestamp: Math.floor(endTimestamp / 1000),
                    remainingTime: match.active ? Math.floor((endTimestamp - nowTimestamp) / 1000) : 0,
                    isActive: match.active,
                    hasCompleted: !match.active && amountPledged === amountMatched,
                    hasExpired: !match.active && endTimestamp <= nowTimestamp
                };
                return matchData;
            }) ?? [],
            matchMultiplier: (donationData?.donation_matches?.length ?? 0) + 1,
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
