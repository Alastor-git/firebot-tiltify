import { TiltifyMilestone } from "@/types/milestone";
import { CampaignEvent, TiltifyCampaignEventData } from "./campaign-event-data";
import { TiltifyCampaign } from "@/types/campaign";
import { TiltifyCause } from "@/types/cause";

export type TiltifyMilestoneReachedEventData = TiltifyCampaignEventData & {
    id: string;
    name: string;
    amount: number;
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
