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
    /**
     * Tiltify ID of the match object
     */
    id: string
    /**
     * Name of the person who's matching
     */
    matchedBy: string;
    /**
     * Maximum amount that's going to be matched before the matching completes
     */
    amountPledged: number;
    /**
     * Amount that has been matched so far
     */
    amountMatched: number;
    /**
     * UNIX Timestamp of the time the matching expires in seconds
     */
    endTimestamp: number;
    /**
     * Time remaining before the matching expires in seconds. 0 if the match has expired or completed.
     */
    remainingTime: number;
    /**
     * Has the Match ended because the end timestamp was reached ?
     */
    hasExpired: boolean;
    /**
     * Has the match ended because the pledged amount was reached ?
     */
    hasCompleted: boolean;
    /**
     * Is the match still going on ?
     */
    isActive: boolean;
};

export function createTiltifyDonationMatchData(donationMatch: TiltifyDonationMatch): TiltifyDonationMatchData {
        // hasExpired refers to the time remaining when it expires. If it expired, ends_at === completed_at
        const nowTimestamp: number = donationMatch.completed_at ? new Date(donationMatch.completed_at).getTime() : Date.now();
        const endTimestamp: number = new Date(donationMatch.ends_at).getTime();
        const amountPledged: number = Number(donationMatch.pledged_amount?.value ?? 0);
        const amountMatched: number = Number(donationMatch.total_amount_raised?.value ?? 0);
        return {
            id: donationMatch.id,
            matchedBy: donationMatch.matched_by,
            amountPledged: amountPledged,
            amountMatched: amountMatched,
            endTimestamp: Math.floor(endTimestamp / 1000),
            remainingTime: donationMatch.active ? Math.floor((endTimestamp - nowTimestamp) / 1000) : 0,
            isActive: donationMatch.active,
            hasCompleted: !donationMatch.active && amountPledged === amountMatched,
            hasExpired: !donationMatch.active && endTimestamp <= nowTimestamp
        };
}

export type TiltifyDonationMatchEventData = TiltifyCampaignEventData & TiltifyDonationMatchData;

const getStartedEventManualMetadata: TiltifyDonationMatchEventData = {
    ...getCampaignManualMetadata,
    id: "30a54e87-43cf-4e82-acc8-f8202cc8b6db",
    matchedBy: "Awesome Donation Matcher",
    amountPledged: 500,
    amountMatched: 0,
    endTimestamp: 1751738400,
    remainingTime: 3600,
    hasExpired: false,
    hasCompleted: false,
    isActive: true
};

function getStartedEventMessage(eventData: TiltifyDonationMatchEventData) {
    const days: number = Math.floor(eventData.remainingTime / 86400);
    const hours: number = Math.floor(eventData.remainingTime / 3600) - days * 24;
    const minutes: number = Math.floor(eventData.remainingTime / 60) - days * 1440 - hours * 60;
    const seconds: number = Math.floor(eventData.remainingTime) - days * 86400 - hours * 3600 - minutes * 60;
    return `**${eventData.matchedBy}** started matching donations up to **$${eventData.amountPledged}** to ${eventData.campaignInfo.name
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
    id: "30a54e87-43cf-4e82-acc8-f8202cc8b6db",
    matchedBy: "Awesome Donation Matcher",
    amountPledged: 500,
    amountMatched: 500,
    endTimestamp: 1751738400,
    remainingTime: 0,
    hasCompleted: true,
    hasExpired: false,
    isActive: false
};

function getEndedEventMessage(eventData: TiltifyDonationMatchEventData) {
    return `**${eventData.matchedBy}**'s pledge to match donations to ${eventData.campaignInfo.name} has ended after matching $${eventData.amountMatched} / $${eventData.amountPledged}.`;
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
            ...createTiltifyDonationMatchData(matchData)
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