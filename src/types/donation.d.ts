import { TiltifyMoney } from "./shared";
import { TiltifyRewardClaim } from "./campaign-reward";
import { TiltifyDonationMatch } from "./donation-match";

/**
 * Donation data provided by Tiltify
 */
export type TiltifyDonation = {
    /**
     * Tiltify ID for the Donation
     */
    id: string;
    /**
     * Tiltify ID of the target campaign
     */
    target_id?: string | null;
    /**
     * Amount of money donated
     */
    amount: TiltifyMoney;
    /**
     * JSON date of when the donation was made
     */
    completed_at: string | null;
    /**
     * Comment left by the donnor
     */
    donor_comment: string | null;
    /**
     * Name of the donnor
     */
    donor_name: string;
    /**
     * Tiltify ID of the poll option chosen if any
     */
    poll_option_id?: string | null;
    /**
     * List of reward claims chosen by the donor
     */
    reward_claims?: TiltifyRewardClaim[] | null;
    /**
     * List of donation matches affecting this donation
     */
    donation_matches: TiltifyDonationMatch[] | null;
};
