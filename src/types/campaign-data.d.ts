import { TiltifyCause } from "./cause";
import { TiltifyCampaign } from "./campaign";
import { TiltifyMilestone } from "./milestone";
import { TiltifyCampaignReward } from "./campaign-reward";
import { SetOptionnal } from "./shared";
import { TiltifyDonationMatchCollection } from "./donation-match";

export type TiltifyCampaignData = {
    campaignId: string;
    cause: TiltifyCause;
    campaign: TiltifyCampaign;
    milestones: TiltifyMilestone[];
    rewards: TiltifyCampaignReward[];
    donationMatches: TiltifyDonationMatchCollection;
    /**
     * JSON representation of the last time a donation match update happened
     */
    lastDonationMatchUpdate: string;
    /**
     * Timestamp of the last time a donation match was polled
     */
    lastDonationMatchPoll: number;
    /**
     * JSON representation of the last time a donation update happened
     */
    lastDonationDate: string;
    donationIds: string[];
};
type TiltifyCampaignDataStep1 = SetOptionnal<
TiltifyCampaignData,
"campaign" | "cause"
> & { Step: "Step 1" };
type TiltifyCampaignDataStep2 = SetOptionnal<TiltifyCampaignData, "cause"> & {
    Step: "Step 2";
};
type TiltifyCampaignDataStep3 = TiltifyCampaignData & { Step: "Step 3" };

/**
 * TypeScript is only able to narrow the types in this kind of case, if we have a disjointed union.
 * So we create a litteral type property to allow it to follow us populating the TiltifyCampaignData
 * See :
 * - https://github.com/microsoft/TypeScript/issues/30506#issuecomment-474802840
 * - https://stackoverflow.com/questions/57928920/typescript-narrowing-of-keys-in-objects-when-passed-to-function
 */
export type PopulatingTiltifyCampaignData =
    | TiltifyCampaignDataStep1
    | TiltifyCampaignDataStep2
    | TiltifyCampaignDataStep3;
