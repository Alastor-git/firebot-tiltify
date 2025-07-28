import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_DONATION_EVENT_ID
} from "@/constants";
import { TiltifyDonationEventData } from "@/events/donation-event-data";
import { TiltifyDonationMatchData } from "@/events/donation-match-event-data";

export const TiltifyDonationMatchesVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationMatches",
        usage: "tiltifyDonationMatches[index?, property?]",
        description: "Access the properties of donation matches associated with a Tiltify donation",
        examples: [
            {
                usage: "tiltifyDonationMatches[]",
                description:
`Returns the JSON array of the donation matches associated with the current donation.`
            },
            {
                usage: "tiltifyDonationMatches[index]",
                description:
`Returns the JSON object associated with the donation match designated by the index or null if the index is out of bounds. 
The total number of matches ca be accessed through $donationMatchMultiplier. `
            },
            {
                usage: "tiltifyDonationMatches[property]",
                description:
`Returns the array of the values of the given property for all donation matches in the current donation or null if the property doesn't exist. 
Valid properties are 'id', 'matchedBy', 'amountPledged', 'amountMatched', 'isDonatingAllPledged', 'endTimestamp', 'remainingTime', 'hasExpired', 'hasCompleted' and 'isActive'. `
            },
            {
                usage: "tiltifyDonationMatches[index, property]",
                description:
`Returns the value of the property for the donation match designated by the index or null if the index is out of bounds or the property doesn't exist. `
            }
        ],
        triggers: {
            event: [`${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_DONATION_EVENT_ID}`],
            manual: true
        },
        possibleDataOutput: [OutputDataType.NUMBER, OutputDataType.TEXT, OutputDataType.BOOLEAN, OutputDataType.OBJECT, OutputDataType.ARRAY, OutputDataType.NULL]
    },
    /*
    * Return values :
    * tiltifyDonationMatches[] : Array of Objects
    * tiltifyDonationMatches[index] : Object or Null if index out of bounds
    * tiltifyDonationMatches[property] : Array of values, Null if property doesn't exist
    * tiltifyDonationMatches[index, property] : Property value, Null if index out of bounds or property doesn't exist
    */
    evaluator: function (trigger, ...args): null | string | number | boolean | TiltifyDonationMatchData | (string | number | boolean | TiltifyDonationMatchData | null)[] {
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
            if (typeof args[1] === "string" && args[1] !== '' && property === null) {
                property = args[1];
            } else if (typeof args[1] === "number" && index === null) {
                index = args[1];
            }
        }

        const eventData: TiltifyDonationEventData = trigger.metadata
            ?.eventData as TiltifyDonationEventData;
        // Get the array of donation matches we want the properties from
        const sortedMatches: TiltifyDonationMatchData[] =
            index === null ? eventData.matches : index >= eventData.matches.length ? [] : [eventData.matches[index]];

        // Get the properties or objects from the relevant donation matches
        let filteredMatches: (string | number | boolean | TiltifyDonationMatchData | null)[] = sortedMatches;
        if (property !== null) {
            filteredMatches = sortedMatches.map((match) => {
                if (property in match) {
                    return match[property as keyof TiltifyDonationMatchData];
                }
                // Property doesn't exist on the object
                return null;
            });
        }

        // Return the proper result depending on request and the number of remaining objects

        // if we just requested the matches array, we always want an array
        if (index === null && property === null) {
            return filteredMatches;
        }

        // If we requested an element with or without specifying a property, we don't want an array
        if (index !== null) {
            // Index out of bounds
            if (filteredMatches.length === 0) {
                return null;
            }
            return filteredMatches[0];
        }

        // If (property !== null && index === null)

        // Property doesn't exist
        if (filteredMatches[0] === null) {
            return null;
        }
        // property exists
        return filteredMatches;
    }
};