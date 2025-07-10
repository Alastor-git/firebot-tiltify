import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_MATCH_STARTED_EVENT_ID,
    TILTIFY_MATCH_ENDED_EVENT_ID
} from "@/constants";
import { TiltifyDonationMatchData, TiltifyDonationMatchEventData } from "@/events/donation-match-event-data";

export const TiltifyDonationMatchVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationMatch",
        usage: "tiltifyDonationMatch[property?]",
        description: "Access the properties of the donation match associated with this event",
        examples: [
            {
                usage: "tiltifyDonationMatch[]",
                description:
`Returns the JSON object of the donation match associated with the current event.`
            },
            {
                usage: "tiltifyDonationMatch[property]",
                description:
`Returns the value of the given property for the donation match or null if the property doesn't exist. 
Valid properties are 'id', 'matchesBy', 'amountPledged', 'amountMatched', 'endTimestamp', 'remainingTime', 'hasExpired', 'hasCompleted' and 'isActive'. `
            }
        ],
        triggers: {
            event: [
                `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_MATCH_STARTED_EVENT_ID}`,
                `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_MATCH_ENDED_EVENT_ID}`
            ],
            manual: true
        },
        possibleDataOutput: [OutputDataType.NUMBER, OutputDataType.TEXT, OutputDataType.BOOLEAN, OutputDataType.OBJECT, OutputDataType.NULL]
    },
    /*
    * Return values :
    * tiltifyDonationMatch[] : JSON Object
    * tiltifyDonationMatch[property] : Value of the property, Null if property doesn't exist
    */
    evaluator: function (trigger, ...args): null | string | number | boolean | TiltifyDonationMatchData {
        let property: string | null = null;
        // If we have a first argument, assign it to property
        if (args.length >= 1) {
            if (typeof args[0] === "string" && args[0] !== '') {
                property = args[0];
            }
        }

        const match: TiltifyDonationMatchEventData = trigger.metadata
            ?.eventData as TiltifyDonationMatchEventData;

        if (property === null) {
            return match; // TiltifyDonationMatchData
        }
        // If property !== null
        if (property in match) {
            return match[property as keyof TiltifyDonationMatchData]; // string | number | boolean
        }
        // Property doesn't exist on the object
        return null;
    }
};