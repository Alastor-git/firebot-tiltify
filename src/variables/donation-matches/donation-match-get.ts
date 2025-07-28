import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";
import { createTiltifyDonationMatchData, TiltifyDonationMatchData } from "@/events/donation-match-event-data";
import { integrationManager } from "@/shared/firebot-modules";
import { TiltifySettings } from "@/tiltify-integration";
import { TILTIFY_INTEGRATION_ID } from "@/constants";
import { tiltifyPollService } from "@/services";

export const TiltifyDonationMatchGetVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationMatchGet",
        usage: "tiltifyDonationMatchGet[id, property?]",
        description: "Access the properties of the donation match with the given id",
        examples: [
            {
                usage: "tiltifyDonationMatchGet[id]",
                description:
`Returns the JSON object of the donation match with the corresponding id. Null if it doesn't exist or the campaign isn't connected. `
            },
            {
                usage: "tiltifyDonationMatchGet[id, property]",
                description:
`Returns the value of the given property for the donation match with the given id or null if the property doesn't exist. 
Valid properties are 'id', 'matchedBy', 'amountPledged', 'amountMatched', 'isDonatingAllPledged', 'endTimestamp', 'remainingTime', 'hasExpired', 'hasCompleted' and 'isActive'. `
            }
        ],
        possibleDataOutput: [OutputDataType.NUMBER, OutputDataType.TEXT, OutputDataType.BOOLEAN, OutputDataType.OBJECT, OutputDataType.NULL]
    },
    /*
    * Return values :
    * tiltifyDonationMatchGet[id] : JSON Object, Null if the object doesn't exist
    * tiltifyDonationMatchGet[id, property] : Value of the property, Null if property doesn't exist
    */
    evaluator: function (trigger, ...args): null | string | number | boolean | TiltifyDonationMatchData {
        let matchId: string | null = null;
        let property: string | null = null;
        // If we have a first argument, assign it to matchId
        if (args.length >= 1) {
            if (typeof args[0] === "string" && args[0] !== '') {
                matchId = args[0];
            }
        }
        // If we have a second argument, assign it to property
        if (args.length >= 2) {
            if (typeof args[1] === "string" && args[1] !== '') {
                property = args[1];
            }
        }

        const campaignId: string = integrationManager.getIntegrationUserSettings<TiltifySettings>(TILTIFY_INTEGRATION_ID).campaignSettings.campaignId;
        const pollerData = tiltifyPollService().pollerData;

        // Validate matchId's type
        if (typeof matchId !== 'string') {
            return null;
        }
        // Validate that we're connected to the campaign
        if (!(campaignId in pollerData)) {
            return null;
        }
        // Validate that the matchId corresponds to an existing match
        if (!(matchId in pollerData[campaignId].donationMatches)) {
            return null;
        }

        // Transform the raw donation match object into the suitable data format to be consistent with the events
        const match: TiltifyDonationMatchData = createTiltifyDonationMatchData(pollerData[campaignId].donationMatches[matchId]);

        // Return the raw object if property isn't specified
        if (property === null) {
            return match; // TiltifyDonationMatchData
        }
        // If property !== null
        // Validate that the property exists in the object
        if (property in match) {
            return match[property as keyof TiltifyDonationMatchData]; // string | number | boolean
        }
        // Property doesn't exist on the object
        return null;
    }
};