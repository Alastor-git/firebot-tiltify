import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_MATCH_STARTED_EVENT_ID,
    TILTIFY_MATCH_ENDED_EVENT_ID
} from "@/constants";
import { TiltifyDonationMatchEventData } from "@/events/donation-match-event-data";

export const TiltifyDonationMatchAmountPledgedVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationMatchAmountPledged",
        usage: "tiltifyDonationMatchAmountPledged",
        description: "The maximum amount that has/will be matched as part of this pledge before the match completes. ",
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
        return eventData?.amountPledged ?? 0;
    }
};