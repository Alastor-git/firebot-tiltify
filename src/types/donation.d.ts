import { TiltifyMoney } from "./shared";

export type TiltifyRewardClaim = {
    id?: string;
    quantity?: number;
    reward_id?: string;
};

export type TiltifyDonation = {
    amount: TiltifyMoney;
    completed_at: string | null;
    donor_comment: string | null;
    donor_name: string;
    id: string;
    poll_option_id?: string | null;
    reward_claims?: TiltifyRewardClaim[] | null;
    reward_id?: string | null;
    target_id?: string | null;
};
