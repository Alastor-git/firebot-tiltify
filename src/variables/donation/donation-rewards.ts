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
        description: "Access the properties of rewards associated with a Tiltify donation",
        examples: [
            {
                usage: "tiltifyDonationRewards[]",
                description: "Returns the JSON array of the rewards claims associated with the current donation."
            },
            {
                usage: "tiltifyDonationRewards[index]",
                description: "Returns the JSON object associated with the reward claim designated by the index. The total number of reward claims ca be accessed through $donationRewardCount. "
            },
            {
                usage: "tiltifyDonationRewards[index, property]",
                description: "Returns the value of the property for the reward claim designated by the index. The total number of reward claims ca be accessed through $donationRewardCount. "
            },
            {
                usage: "tiltifyDonationRewards[property]",
                description: "Returns the array of the values of the given property for all rewards claims in the current donation. "
            }
        ],
        triggers: {
            event: [`${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_DONATION_EVENT_ID}`],
            manual: true
        },
        possibleDataOutput: [OutputDataType.NUMBER, OutputDataType.TEXT, OutputDataType.OBJECT, OutputDataType.ARRAY, OutputDataType.NULL]
    },
    evaluator: function (trigger, ...args): null | string | number | TiltifyRewardClaimEventData | (string | number | TiltifyRewardClaimEventData)[] {
        let index: number | null = null;
        let property: string | null = null;
        // If we have a first argument, assign it to index or proerty depending on its type
        if (args.length === 1) {
            if (typeof args[0] === "number") {
                index = args[0];
            } else if (typeof args[0] === "string") {
                property = args[0];
            }
        // If we have a second argument, assign it to index or proerty depending on its type
        } else if (args.length >= 2) {
            if (typeof args[1] === "string") {
                property = args[1];
            } else if (typeof args[1] === "number") {
                index = args[1];
            }
        }

        const eventData: TiltifyDonationEventData = trigger.metadata
            ?.eventData as TiltifyDonationEventData;
        // Get the array of rewards we want the properties from
        const sortedRewards: TiltifyRewardClaimEventData[] =
            index === null ? eventData.rewards : index >= eventData.rewards.length ? [] : [eventData.rewards[index]];

        // Get the properties or objects from the relevant rewad claims
        let filteredRewards: (string | number | TiltifyRewardClaimEventData)[] = sortedRewards;
        if (property !== null) {
            filteredRewards = sortedRewards.map((rewardClaim) => {
                if (property in rewardClaim) {
                    return rewardClaim[property as keyof TiltifyRewardClaimEventData] ?? 0;
                }
                return "";
            });
        }

        // Return the proper result depending on the the number of remaining objects
        if (filteredRewards.length === 0) {
            return null;
        } else if (filteredRewards.length === 1) {
            return filteredRewards[0];
        }
        return filteredRewards;
    }
};