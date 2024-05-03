import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_DONATION_EVENT_ID
} from "../constants";
import { TiltifyDonationEventData } from "../events/donation-event-data";

export const TiltifyDonationCampaignSupportingRaisedVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationCampaignSupportingRaised",
        description: "The amount of money raised by supporting campaigns that received a donation from Tiltify",
        triggers: {
            "event": [
                `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_DONATION_EVENT_ID}`
            ],
            "manual": true
        },
        possibleDataOutput: ["number"]
    },
    evaluator: function (trigger) {
        return (trigger.metadata?.eventData as TiltifyDonationEventData)?.campaignInfo?.supportingRaised ?? 0;
    }
};