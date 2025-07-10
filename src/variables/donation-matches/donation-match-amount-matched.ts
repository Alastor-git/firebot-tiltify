import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_MATCH_STARTED_EVENT_ID,
    TILTIFY_MATCH_ENDED_EVENT_ID
} from "@/constants";
import { TiltifyDonationMatchEventData } from "@/events/donation-match-event-data";

export const TiltifyDonationMatchAmountMatchedVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationMatchAmountMatched",
        usage: "tiltifyDonationMatchAmountMatched",
        description: "The actual amount that has been matched as part of this pledge. ",
        triggers: {
            event: [
                `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_MATCH_STARTED_EVENT_ID}`,
                `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_MATCH_ENDED_EVENT_ID}`
            ],
            manual: true
        },
        possibleDataOutput: [OutputDataType.NUMBER]
    },
    evaluator: function (trigger): number {
        const eventData: TiltifyDonationMatchEventData = trigger.metadata
            ?.eventData as TiltifyDonationMatchEventData;
        return eventData?.amountMatched ?? 0;
    }
};