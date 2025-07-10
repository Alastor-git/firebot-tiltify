import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_MATCH_ENDED_EVENT_ID
} from "@/constants";
import { TiltifyDonationMatchEventData } from "@/events/donation-match-event-data";

export const TiltifyDonationHasCompletedVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationMatchHasCompleted",
        usage: "tiltifyDonationMatchHasCompleted",
        description: "Has the donation match ended because the pledged amount was reached ? ",
        triggers: {
            event: [
                `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_MATCH_ENDED_EVENT_ID}`
            ],
            manual: true
        },
        possibleDataOutput: [OutputDataType.BOOLEAN]
    },
    evaluator: function (trigger): boolean {
        const eventData: TiltifyDonationMatchEventData = trigger.metadata
            ?.eventData as TiltifyDonationMatchEventData;
        return eventData?.hasCompleted ?? false;
    }
};