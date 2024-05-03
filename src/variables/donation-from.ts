import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_DONATION_EVENT_ID
} from "../constants";

export const TiltifyDonationFromVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationFrom",
        description: "The name of who sent a Tiltify donation",
        triggers: {
            "event": [
                `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_DONATION_EVENT_ID}`
            ],
            "manual": true
        },
        possibleDataOutput: ["text"]
    },
    evaluator: function (trigger) {
        return trigger.metadata?.eventData?.from ?? "Unknown User";
    }
};