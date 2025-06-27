import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_DONATION_EVENT_ID
} from "@/constants";
import { TiltifyDonationEventData } from "@/events/donation-event-data";

export const TiltifyDonationRewardQuantityRemainingVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationRewardQuantityRemaining",
        usage: "tiltifyDonationRewardQuantityRemaining[id]",
        description: "The quantity of the reward with the matching Id that remains after the current redemption. Returns 0 if no limit has been set. ",
        triggers: {
            event: [`${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_DONATION_EVENT_ID}`],
            manual: true
        },
        possibleDataOutput: [OutputDataType.NUMBER]
    },
    evaluator: function (trigger, rewardId: string): number {
        const eventData: TiltifyDonationEventData = trigger.metadata
            ?.eventData as TiltifyDonationEventData;
        return eventData?.rewards.find(rewardClaim => rewardClaim.id === rewardId)?.quantityRemaining ?? 0;
    }
};