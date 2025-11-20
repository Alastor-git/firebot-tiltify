# Tiltify Firebot Plugin

A [Firebot](https://firebot.app) plugin/custom script for interacting with [Tiltify](https://tiltify.com) campaigns.
Based on the Tiltify Integration plugin by [zunderscore](https://github.com/zunderscore/firebot-tiltify). 
Debugged and improved to cover wider needs and provide more functionality.

## Summary

This integration listens to a Tiltify Campaign, raises events in firebot when some things happen in the campaign and allows the commands and events to access a number of things about the campaign or associated the events. 

Events are raised when : 
- A Donation happens
- A Donation Match starts
- A Donation Match stops
- A Milestone has been reached

## Installation

To install the script: 
- Download the [latest release of `firebot-tiltify.js`](https://github.com/Alastor-git/firebot-unit-converter/releases/download/v3.0.1/firebot-tiltify.js). 
- In Firebot, access `File/Open Data Folder` to open your stream profile. 
- Paste `firebot-tiltify.js` in the `scripts` folder. 
- In Firebot's `Settings/Scripts`
    - Set `Custom Scripts` to `Enabled`
    - Open `Manage Startup Scripts`, select `Add New Script` and select `firebot-tiltify.js`
- In Firebot's `Settings/Integrations` Menu, a new `Tiltify` line will appear. 
    - Link it
    - Click `Configure` and input the ID of the campaign you want Firebot to receive events for.  
    This ID can be located by clicking the `Donate` button on the campaign and copying the string of numbers and letters in the first part of the URI.  
    For example, for the campaign of the [Rimworld Hot Potato 2025 event](https://tiltify.com/+rimworld-hot-potato-2025/rimworld-hot-potato-2025), the donation link URI is `https://donate.tiltify.com/d3b43e70-ae08-49a8-b6f9-b324e3392b61/details`. The campaign ID is `d3b43e70-ae08-49a8-b6f9-b324e3392b61`. 
- At the bottom of the left menu, under `Connections`, a tiltify integration icon will have appeared, allowing you to connect or disconnect the integration. 
- If you want some of the integration's events to appear in the Dashboard's activity feed, don't forget to enable them using the `...` menu of the feed. 

The tiltify events and variables should now be available. 

## More details

- Events
    - Donation
    - Donation Match Started
    - Donation Match Ended
    - Milestone Reached

- Variables
    - Available even outside of events
        - `$tiltifyDonationMatchGetActiveIds`: The Array of Ids of the active donation matches known for the active campaign. Null if the campaign is not being polled. 
        - `$tiltifyDonationMatchGetIds`: The Array of Ids of the donation matches known for the active campaign. Null if the campaign is not being polled. 
        - `$tiltifyDonationMatchGet[id, property?]`: Access the properties of the donation match with the given id
        - `$tiltifyDonationMatchIsActive[Id]`: Returns whether the Id corresponds to an active match or not. Null if the match doesn't exist or the campaign isn't connected. 
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
- Event Filters (currently may not work)
    - Reward
    - Poll Option
    - Challenge/Target
