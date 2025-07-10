import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_MATCH_STARTED_EVENT_ID,
    TILTIFY_MATCH_ENDED_EVENT_ID
} from "@/constants";
import { TiltifyDonationMatchEventData } from "@/events/donation-match-event-data";

export const TiltifyDonationMatchNameVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationMatchName",
        usage: "tiltifyDonationMatchName",
        description: "The Name of the person who is matching donations. ",
        triggers: {
            event: [
                `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_MATCH_STARTED_EVENT_ID}`,
                `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_MATCH_ENDED_EVENT_ID}`
            ],
            manual: true
        },
        possibleDataOutput: [OutputDataType.TEXT]
    },
    evaluator: function (trigger): string {
        const eventData: TiltifyDonationMatchEventData = trigger.metadata
            ?.eventData as TiltifyDonationMatchEventData;
        return eventData?.matchedBy ?? "";
    }
};