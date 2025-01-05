import { TiltifyCampaign } from "@/types/campaign";
import { TiltifyCause } from "@/types/cause";

export type TiltifyCampaignEventData = {
    campaignInfo: {
        name: string;
        cause: string;
        causeLegalName: string;
        fundraisingGoal: number;
        originalGoal: number;
        supportingRaised: number;
        amountRaised: number;
        totalRaised: number;
    };
};

export function createCampaignEvent(
    campaignData: TiltifyCampaign,
    causeData: TiltifyCause
): TiltifyCampaignEventData {
    const eventDetails: TiltifyCampaignEventData = {
        campaignInfo: {
            name: campaignData?.name,
            cause: causeData?.name,
            causeLegalName: causeData?.name,
            fundraisingGoal: Number(campaignData.goal?.value ?? 0),
            originalGoal: Number(campaignData?.original_goal?.value ?? 0),
            supportingRaised:
                Number(campaignData?.total_amount_raised?.value ?? 0) -
                Number(campaignData?.amount_raised?.value ?? 0),
            amountRaised: Number(campaignData?.amount_raised?.value ?? 0),
            totalRaised: Number(campaignData?.total_amount_raised?.value ?? 0)
        }
    };
    return eventDetails;
}
