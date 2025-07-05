import {
    TILTIFY_MATCH_STARTED_EVENT_ID,
    TILTIFY_MATCH_ENDED_EVENT_ID
} from "@/constants";
import { FirebotEvent } from "@/@types/firebot-events";
import { TiltifyDonationMatch } from "@/types/donation-match";

import {
    CampaignEvent,
    TiltifyCampaignEventData,
    getManualMetadata as getCampaignManualMetadata
} from "./campaign-event-data";

export type TiltifyDonationMatchData = {
    matchedBy: string; // Name of the person who's matching this donation
    pledgedAmount: number; // Up to how much they are matching
    amountMatched: number; // Amount that has been matched so far
    endsAtTimestamp: number; // Timestamp of the end of the matching in seconds
    remainingTime: number; // Time remaining for the duration in seconds. 0 if the match has ended.
};

export type TiltifyDonationMatchEventData = TiltifyCampaignEventData & TiltifyDonationMatchData;

const getStartedEventManualMetadata: TiltifyDonationMatchEventData = {
    ...getCampaignManualMetadata,
    matchedBy: "Awesome Donation Matcher",
    pledgedAmount: 500,
    amountMatched: 0,
    endsAtTimestamp: 1751738400,
    remainingTime: 3600
};

function getStartedEventMessage(eventData: TiltifyDonationMatchEventData) {
    const days: number = Math.floor(eventData.remainingTime / 86400);
    const hours: number = Math.floor(eventData.remainingTime / 3600) - days * 24;
    const minutes: number = Math.floor(eventData.remainingTime / 60) - days * 1440 - hours * 60;
    const seconds: number = Math.floor(eventData.remainingTime) - days * 86400 - hours * 3600 - minutes * 60;
    return `**${eventData.matchedBy}** started matching donations up to **$${eventData.pledgedAmount}** to ${eventData.campaignInfo.name
        } for the next ${days > 0 ? `${days} days, ` : ""}${hours}h ${minutes}m ${seconds}s`;
}

export const TiltifyMatchStartedEvent: FirebotEvent = {
    id: TILTIFY_MATCH_STARTED_EVENT_ID,
    name: "Donation Match Started",
    description: "When someone pledges to match Tiltify donations up to a certain amount or a certain time limit.",
    cached: false,
    manualMetadata: getStartedEventManualMetadata,
    //@ts-ignore
    isIntegration: true,
    queued: true,
    activityFeed: {
        icon: "fad fa-hands-heart",
        getMessage: getStartedEventMessage
    }
};


const getEndedEventManualMetadata: TiltifyDonationMatchEventData = {
    ...getCampaignManualMetadata,
    matchedBy: "Awesome Donation Matcher",
    pledgedAmount: 500,
    amountMatched: 500,
    endsAtTimestamp: 1751738400,
    remainingTime: 0
};

function getEndedEventMessage(eventData: TiltifyDonationMatchEventData) {
    return `**${eventData.matchedBy}**'s pledge to match donations to ${eventData.campaignInfo.name} has ended after matching $${eventData.amountMatched} / $${eventData.pledgedAmount}.`;
}

export const TiltifyMatchEndedEvent: FirebotEvent = {
    id: TILTIFY_MATCH_ENDED_EVENT_ID,
    name: "Donation Match Ended",
    description: "When someone's pledge to match Tiltify donations up to a certain amount or a certain time limit has ended.",
    cached: false,
    manualMetadata: getEndedEventManualMetadata,
    //@ts-ignore
    isIntegration: true,
    queued: true,
    activityFeed: {
        icon: "fad fa-hands-heart",
        getMessage: getEndedEventMessage
    }
};


export class MatchEvent {
    data: TiltifyDonationMatchEventData;

    constructor(matchData: TiltifyDonationMatch, campaignEvent: CampaignEvent) {
        this.data = {
            ...campaignEvent.valueOf(),
            matchedBy: matchData.matched_by,
            pledgedAmount: Number(matchData.pledged_amount?.value ?? 0),
            amountMatched: Number(matchData.total_amount_raised?.value ?? 0),
            endsAtTimestamp: new Date(matchData.ends_at).getTime() / 1000,
            remainingTime: matchData.active ? (new Date(matchData.ends_at).getTime() - new Date().getTime()) / 1000 : 0

        };
    };

    valueOf(): TiltifyDonationMatchEventData {
        return this.data;
    }
};

declare module "./campaign-event-data" {
    interface CampaignEvent {
        createMatchStartedEvent(
            match: TiltifyDonationMatch
        ): MatchEvent;

        createMatchEndedEvent(
            match: TiltifyDonationMatch
        ): MatchEvent;
    }
}

CampaignEvent.prototype.createMatchStartedEvent = function (
    match: TiltifyDonationMatch
): MatchEvent {
    return new MatchEvent(match, this as CampaignEvent);
};

CampaignEvent.prototype.createMatchEndedEvent = function (
    match: TiltifyDonationMatch
): MatchEvent {
    return new MatchEvent(match, this as CampaignEvent);
};