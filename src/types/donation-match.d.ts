import { TiltifyMoney } from "./shared";

/**
 * Donation Match data provided by Tiltify
 */
export type TiltifyDonationMatch = {
    /**
     * Tiltify ID for the Donation Match
     */
    id: string;
    /**
     * Tiltify ID for the donation associated with the Match that happens when the match ends.
     */
    donation_id: string | null;
    /**
     * Is the Match still active ?
     */
    active: boolean;
    /**
     * Name of the user doing the matching
     */
    matched_by: string;
    /**
     * JSON Date of the match creation
     */
    inserted_at: string;
    /**
     * JSON date seems to be set to ends_at at all times
     */
    starts_at: string;
    /**
     * null until the donation match completes, then the JSON date of the match completion.
     * Same as ends_at if the match expired.
     */
    completed_at: string | null;
    /**
     * JSON date of when the donation match expires
     */
    ends_at: string;
    /**
     * JSON date. equals inserted_at as long as the match is active, then completed_at afterwards
     */
    updated_at: string;
    /**
     * Supposedly 'all' if the money is given anyway at the end of the match, 'amount' if the non matched money is refunded.
     * Currently not provided by Tiltify. This is a bug.
     */
    match_type?: string;
    /**
     * The money raised by the campaign when the match started
     */
    started_at_amount: TiltifyMoney;
    /**
     * The money that will actually be given at the end of the match.
     * Identical to pledged_amount if the match_type is 'all'
     */
    amount: TiltifyMoney;
    /**
     * The amount of money that can be matched before the pledge ends
     */
    pledged_amount: TiltifyMoney;
    /**
     * The amount of money that has been matched so far
     */
    total_amount_raised: TiltifyMoney;
};

export type TiltifyDonationMatchCollection = {[matchId: string]: TiltifyDonationMatch};