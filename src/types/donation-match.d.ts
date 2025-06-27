import { TiltifyMoney } from "./shared";

export type TiltifyDonationMatch = {
    id: string;
    donation_id: string | null;
    active: boolean;
    matched_by: string;
    // Time data
    inserted_at: string; // Timestamp of the match creation
    starts_at: string; // Timestamp of when the donation match became active
    completed_at: string | null; // Timestamp of when the match ended (amount reached of end time reached)
    ends_at: string; // Timestamp of when the donation match will expire
    updated_at: string;
    // Money data
    match_type?: string; // 'all' if the money is given anyway at the end of the match, 'amount' if the non matched money is refunded.
    started_at_amount: TiltifyMoney; // The money raised by the campaign when the match started
    amount: TiltifyMoney; // The amount of money that has been matched
    pledged_amount: TiltifyMoney; // The amount of money that can be matched before the pledge ends
    total_amount_raised: TiltifyMoney; // FIXME: Unclear what this one means
};

export type TiltifyDonnationMatchCollection = {[matchId: string]: TiltifyDonationMatch};

/*
 * Polling Starts :
 * - Pull donation matches from database
 * - Ask API for any update since last update to donation matches
 * - If new active donation matches, Raise New match event
 * - If new completed donation matches, store them but ignore them
 * - Update database for donation matches if anything changed
 *
 * Update donation :
 * - If new donation
 *   - check its donation matches for unknown ones
 *   - If new match, raise new donation matche event
 *   - check all active donation matches for if completed
 *   - If completed match, raise donation match end event
 *   - check all active donation matches for if deadline expired
 *   - If expired match, raise donation match end event
 *   - Update database for donation matches if anything changed
 *
 * - If no new donation
 *   - ask API for updates to donation matches
 *   - If new match, raise new donation matche event
 *   - check updates for if match completed
 *   - If completed match, raise donation match end event
 *   - Update database for donation matches if anything changed
 */