import { TiltifyCause } from "./cause";
import { TiltifyCampaign } from "./campaign";
import { TiltifyMilestone } from "./milestone";
import { TiltifyCampaignReward } from "./campaign-reward";

export type TiltifyCampaignData = {
    campaignId: string;
    cause: TiltifyCause;
    campaign: TiltifyCampaign;
    milestones: TiltifyMilestone[];
    rewards: TiltifyCampaignReward[];
};
