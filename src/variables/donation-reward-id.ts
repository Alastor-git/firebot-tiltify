import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_DONATION_EVENT_ID
} from "../constants";

export const TiltifyDonationRewardIdVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationRewardId",
        description: "The reward ID of a donation from Tiltify",
        triggers: {
            "event": [
                `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_DONATION_EVENT_ID}`
            ],
            "manual": true
        },
        possibleDataOutput: ["number"]
    },
    evaluator: function (trigger) {
        return trigger.metadata?.eventData?.rewardId ?? -1;
    }
};