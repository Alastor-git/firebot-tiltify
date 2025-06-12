import { TiltifyMoney } from "./shared";
import { TiltifyRewardClaim } from "./campaign-reward";

export type TiltifyDonation = {
    amount: TiltifyMoney;
    completed_at: string | null;
    donor_comment: string | null;
    donor_name: string;
    id: string;
    poll_option_id?: string | null;
    reward_claims?: TiltifyRewardClaim[] | null;
    target_id?: string | null;
};
