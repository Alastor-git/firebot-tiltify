import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_DONATION_EVENT_ID
} from "@/constants";
import { TiltifyDonationEventData, TiltifyRewardClaimEventData } from "@/events/donation-event-data";

export const TiltifyDonationRewardsVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationRewards",
        usage: "tiltifyDonationRewards[index?, property?]",
        description: "Access the properties of rewards associated with a Tiltify donation",
        examples: [
            {
                usage: "tiltifyDonationRewards[]",
                description:
`Returns the JSON array of the rewards claims associated with the current donation.`
            },
            {
                usage: "tiltifyDonationRewards[index]",
                description:
`Returns the JSON object associated with the reward claim designated by the index or null if the index is out of bounds. 
The total number of reward claims ca be accessed through $donationRewardCount. `
            },
            {
                usage: "tiltifyDonationRewards[property]",
                description:
`Returns the array of the values of the given property for all rewards claims in the current donation or null if the property doesn't exist. 
Valid properties are 'id', 'name', 'quantityAvailable', 'quantityRemaining', 'quantityRedeemed', 'cost', 'description'. `
            },
            {
                usage: "tiltifyDonationRewards[index, property]",
                description:
`Returns the value of the property for the reward claim designated by the index or null if the index is out of bounds or the property doesn't exist. `
            }
        ],
        triggers: {
            event: [`${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_DONATION_EVENT_ID}`],
            manual: true
        },
        possibleDataOutput: [OutputDataType.NUMBER, OutputDataType.TEXT, OutputDataType.OBJECT, OutputDataType.ARRAY, OutputDataType.NULL]
    },
    /*
    * Return values :
    * tiltifyDonationRewards[] : Array of Objects
    * tiltifyDonationRewards[index] : Object or Null if index out of bounds
    * tiltifyDonationRewards[property] : Array of values, Null if property doesn't exist
    * tiltifyDonationRewards[index, property] : Property value, Null if index out of bounds or property doesn't exist
    */
    evaluator: function (trigger, ...args): null | string | number | TiltifyRewardClaimEventData | (string | number | TiltifyRewardClaimEventData | null)[] {
        let index: number | null = null;
        let property: string | null = null;
        // If we have a first argument, assign it to index or property depending on its type
        if (args.length >= 1) {
            // If the first argument is a string representing a number, convert it to a number
            if (!isNaN(parseFloat(args[0])) && isFinite(args[0])) {
                args[0] = parseFloat(args[0]);
            }
            if (typeof args[0] === "number") {
                index = args[0];
            } else if (typeof args[0] === "string" && args[0] !== '') {
                property = args[0];
            }
        }
        // If we have a second argument, assign it to index or property depending on its type
        if (args.length >= 2) {
            // If the second argument is a string representing a number, convert it to a number
            if (!isNaN(parseFloat(args[1])) && isFinite(args[1])) {
                args[1] = parseFloat(args[1]);
            }
            if (typeof args[1] === "string" && args[0] !== '' && property === null) {
                property = args[1];
            } else if (typeof args[1] === "number" && index === null) {
                index = args[1];
            }
        }

        const eventData: TiltifyDonationEventData = trigger.metadata
            ?.eventData as TiltifyDonationEventData;
        // Get the array of rewards we want the properties from
        const sortedRewards: TiltifyRewardClaimEventData[] =
            index === null ? eventData.rewards : index >= eventData.rewards.length ? [] : [eventData.rewards[index]];

        // Get the properties or objects from the relevant reward claims
        let filteredRewards: (string | number | TiltifyRewardClaimEventData | null)[] = sortedRewards;
        if (property !== null) {
            filteredRewards = sortedRewards.map((rewardClaim) => {
                if (property in rewardClaim) {
                    return rewardClaim[property as keyof TiltifyRewardClaimEventData] ?? 0;
                }
                // Property doesn't exist on the object
                return null;
            });
        }

        // Return the proper result depending on request and the number of remaining objects

        // if we just requested the rewards array, we always want an array
        if (index === null && property === null) {
            return filteredRewards;
        }

        // If we requested an element with or without specifying a property, we don't want an array
        if (index !== null) {
            // Index out of bounds
            if (filteredRewards.length === 0) {
                return null;
            }
            return filteredRewards[0];
        }

        // If (property !== null && index === null)

        // Property doesn't exist
        if (filteredRewards[0] === null) {
            return null;
        }
        // property exists
        return filteredRewards;
    }
};