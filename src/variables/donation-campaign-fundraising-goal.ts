import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_DONATION_EVENT_ID
} from "../constants";
import { TiltifyDonationEventData } from "../events/donation-event-data";

export const TiltifyDonationCampaignFundraisingGoalVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationCampaignFundraisingGoal",
        description: "The fundraising goal of the cause that received a donation from Tiltify",
        triggers: {
            "event": [
                `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_DONATION_EVENT_ID}`
            ],
            "manual": true
        },
        possibleDataOutput: ["number"]
    },
    evaluator: function (trigger) {
        return (trigger.metadata?.eventData as TiltifyDonationEventData)?.campaignInfo?.fundraisingGoal ?? 0;
    }
};