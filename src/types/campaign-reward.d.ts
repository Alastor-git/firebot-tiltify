import { TiltifyMoney } from "./shared";

export type TiltifyCampaignReward = {
    id: string;
    name: string;
    amount: TiltifyMoney;
    active: boolean;
    description: string | null;
    quantity: number | null;
    quantity_remaining: number | null;
};

export type TiltifyRewardClaim = {
    id?: string;
    quantity?: number;
    reward_id?: string;
    reward?: TiltifyCampaignReward;
};