import { TiltifyMilestone } from "@/types/milestone";
import { TiltifyCampaignEventData } from "./campaign-event-data";

export type TiltifyMilestoneReachedEventData = TiltifyCampaignEventData & {
    id: string;
    name: string;
    amount: number;
};

export function createMilestoneReachedEvent(
    campaignEvent: TiltifyCampaignEventData,
    milestone: TiltifyMilestone
): TiltifyMilestoneReachedEventData {
    const eventDetails = campaignEvent as TiltifyMilestoneReachedEventData;
    eventDetails.id = milestone.id;
    eventDetails.name = milestone.name;
    eventDetails.amount = Number(milestone.amount.value);
    return eventDetails;
}
