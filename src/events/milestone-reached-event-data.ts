import { TiltifyMilestone } from "@/types/milestone";
import { CampaignEvent, TiltifyCampaignEventData, getManualMetadata as getCampaignManualMetadata } from "./campaign-event-data";
import { TiltifyCampaign } from "@/types/campaign";
import { TiltifyCause } from "@/types/cause";
import { FirebotEvent } from "@/@types/firebot-events";
import { TILTIFY_MILESTONE_EVENT_ID } from "@/constants";

export type TiltifyMilestoneReachedEventData = TiltifyCampaignEventData & {
    id: string;
    name: string;
    amount: number;
};

const getManualMetadata: TiltifyMilestoneReachedEventData = {
    ...getCampaignManualMetadata,
    id: "",
    name: "Awesome Milestone",
    amount: 1000
};

function getMessage(eventData: TiltifyMilestoneReachedEventData) {
    return `Milestone **${eventData.name}** reached in campaign ${eventData.campaignInfo.name}. 
Threshold: $${eventData.amount}`;
};

export const TiltifyMilestoneReachedEvent: FirebotEvent = {
    id: TILTIFY_MILESTONE_EVENT_ID,
    name: "Milestone Reached",
    description:
        "When a Milestone of your Tiltify campaign has been reached.",
    cached: false,
    manualMetadata: getManualMetadata,
    //@ts-ignore
    isIntegration: true,
    queued: true,
    activityFeed: {
        icon: "fad fa-heartbeat",
        getMessage: getMessage
    }
};

export class MilestoneReachedEvent {
    data: TiltifyMilestoneReachedEventData;

    constructor();
    constructor(milestoneData: TiltifyMilestone);
    constructor(
        milestoneData: TiltifyMilestone,
        campaignData: TiltifyCampaign,
        causeData?: TiltifyCause
    );
    constructor(milestoneData: TiltifyMilestone, campaignData: CampaignEvent);
    constructor(
        milestoneData?: TiltifyMilestone,
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
            id: milestoneData?.id ?? "",
            name: milestoneData?.name ?? "",
            amount: Number(milestoneData?.amount?.value ?? 0)
        };
    }

    valueOf(): TiltifyMilestoneReachedEventData {
        return this.data;
    }
}

declare module "./campaign-event-data" {
    interface CampaignEvent {
        createMilestoneEvent(
            milestone: TiltifyMilestone
        ): MilestoneReachedEvent;
    }
}

CampaignEvent.prototype.createMilestoneEvent = function (
    milestone: TiltifyMilestone
): MilestoneReachedEvent {
    return new MilestoneReachedEvent(milestone, this);
};
