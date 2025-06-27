import { TiltifyMoney } from "./shared";
import { TiltifyRewardClaim } from "./campaign-reward";
import { TiltifyDonationMatch } from "./donation-match";

export type TiltifyDonation = {
    amount: TiltifyMoney;
    completed_at: string | null;
    donor_comment: string | null;
    donor_name: string;
    id: string;
    poll_option_id?: string | null;
    reward_claims?: TiltifyRewardClaim[] | null;
    target_id?: string | null;
    donation_matches: TiltifyDonationMatch[] | null;
};
