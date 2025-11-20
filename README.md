# Tiltify Firebot Plugin

A [Firebot](https://firebot.app) plugin/custom script for interacting with [Tiltify](https://tiltify.com) campaigns.
Based on the Tiltify Integration plugin by [zunderscore](https://github.com/zunderscore/firebot-tiltify). 
Debugged and improved to cover wider needs and provide more functionality.

Adds the following functionality to Firebot:

- Events
    - Donation
    - Donation Match Started
    - Donation Match Ended
    - Milestone Reached
- Variables
    - For all events
        - `$tiltifyCampaignName`: The name of the Tiltify campaign related to the event
        - `$tiltifyCampaignCause`: The cause of the Tiltify campaign related to the event
        - `$tiltifyCampaignGoal`: The current goal of the Tiltify campaign related to the event
        - `$tiltifyCampaignOriginalGoal`: The original goal set by the fundraiser of the Tiltify campaign related to the event
        - `$tiltifyCampaignSupportingRaised`: The amount of money raised by the Tiltify supporting campaigns related to the event
        - `$tiltifyCampaignRaised`: The amount of money raised by the Tiltify campaign related to the event
        - `$tiltifyCampaignTotalRaised`: The total amount of money raised by the Tiltify cause related to the event
        - `$tiltifyCampaignCauseLegal` (deprecated)
    - For donation events
        - `$tiltifyDonationAmount`: The amount of a donation from Tiltify
        - `$tiltifyDonationComment`: The comment of a donation from Tiltify
        - `$tiltifyDonationFrom`: The name of who sent a Tiltify donation
        - `$tiltifyDonationIsMatch`: Is the donation resulting from a donation match ending ? 
        - `$tiltifyDonationMatchIds`: The Array of Ids the matches for this donation.
        - `$tiltifyDonationMultiplier`: The multiplier to apply to the donation amount accounting for donation matches (if a donation match only partially matches the donation, this still counts as 1)
        - `$tiltifyDonationMatchNames`: The array of names of the people matching this donation. 
        - `$tiltifyDonationMatches[index?, property?]`: Access the properties of donation matches associated with a Tiltify donation
        - `$tiltifyDonationRewardCost[id]`: The cost of the reward attached to the current Tiltify donation and with the given Id
        - `$tiltifyDonationRewardcount[id]`: The description of the reward attached to the current Tiltify donation and with the given Id
        - `$tiltifyDonationRewardIds`: tiltifyDonationRewardIds
        - `$tiltifyDonationRewardName[id]`: The name of the reward attached to the current Tiltify donation and with the given Id
        - `$tiltifyDonationRewardQuantityAvailable[id]`: The total quantity of the reward attached to the current Tiltify donation and with the matching Id that is available for redemption. Returns 0 if no limit has been set.
        - `$tiltifyDonationRewardQuantityRedeemed[id]`: The quantity of the reward with the matching Id that has been redeemed in this Tiltify donation.
        - `$tiltifyDonationRewardQuantityRemaining[id]`: The quantity of the reward with the matching Id that remains after the current redemption. Returns 0 if no limit has been set. 
        - `$tiltifyDonationRewards[index, property]`: `Returns the array of the values of the given property for all rewards claims in the current donation or null if the property doesn't exist. 
    - For Milestone Reached Event
        - `$tiltifyMilestoneAmount`: The amount collected to reach the Tiltify Milestone
        - `$tiltifyMilestoneId` : The Id of the Tiltify Milestone reached
        - `$tiltifyMilestoneName` : The name of the Tiltify Milestone reached
    - For Donation Match Events
        - `$tiltifyDonationMatchAmountMatched`: The actual amount that has been matched as part of this pledge. 
        - `$tiltifyDonationMatchAmountPledged`: The maximum amount that has/will be matched as part of this pledge before the match completes. 
        - `$tiltifyDonationMatchEndTimestamp`: The UNIX timestamp of when this donation match expires. 
        - `$tiltifyDonationMatchHasCompleted` (Match ending only): Has the donation match ended because the pledged amount was reached ? 
        - `$tiltifyDonationMatchHasExpired` (Match ending only): Has the donation match ended because the end timestamp was reached ? 
        - `$tiltifyDonationMatchId`: The Id of the donation match for this event. 
        - `$tiltifyDonationMatchIsDonatingAllPledged`: Returns true if all of the pledged amount is donated at the end of the match even if not everything has been matched. 
        - `$tiltifyDonationMatchName`: The Name of the person who is matching donations. 
        - `$tiltifyDonationMatchRemainingTime` (Match starting only): The remaining time before this donation match expires (in seconds). 
        - `$tiltifyDonationMatch[property?]`: Access the properties of the donation match associated with this event
    - Always available
        - `$tiltifyDonationMatchGetActiveIds`: The Array of Ids of the active donation matches known for the active campaign. Null if the campaign is not being polled. 
        - `$tiltifyDonationMatchGetIds`: The Array of Ids of the donation matches known for the active campaign. Null if the campaign is not being polled. 
        - `$tiltifyDonationMatchGet[id, property?]`: Access the properties of the donation match with the given id
        - `$tiltifyDonationMatchIsActive[Id]`: Returns whether the Id corresponds to an active match or not. Null if the match doesn't exist or the campaign isn't connected. 
- Event Filters (currently may not work)
    - Reward
    - Poll Option
    - Challenge/Target
