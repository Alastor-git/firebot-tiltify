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

export const getManualMetadata: TiltifyCampaignEventData = {
    campaignInfo: {
        name: "GOTEL",
        cause: "Lupus Foundation of America",
        causeLegalName: "Lupus Foundation of America, Inc.",
        fundraisingGoal: 1000,
        originalGoal: 500,
        supportingRaised: 500,
        amountRaised: 1000,
        totalRaised: 1500
    }
};

export class CampaignEvent {
    data: TiltifyCampaignEventData;

    constructor(campaignData?: TiltifyCampaign, causeData?: TiltifyCause) {
        const eventDetails: TiltifyCampaignEventData = {
            campaignInfo: {
                name: campaignData?.name ?? "",
                cause: causeData?.name ?? "",
                causeLegalName: causeData?.name ?? "",
                fundraisingGoal: Number(campaignData?.goal?.value ?? 0),
                originalGoal: Number(campaignData?.original_goal?.value ?? 0),
                supportingRaised:
                    Number(campaignData?.total_amount_raised?.value ?? 0) -
                    Number(campaignData?.amount_raised?.value ?? 0),
                amountRaised: Number(campaignData?.amount_raised?.value ?? 0),
                totalRaised: Number(
                    campaignData?.total_amount_raised?.value ?? 0
                )
            }
        };
        this.data = eventDetails;
    }

    valueOf(): TiltifyCampaignEventData {
        return this.data;
    }
}
