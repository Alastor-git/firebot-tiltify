import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_MATCH_ENDED_EVENT_ID,
    TILTIFY_MATCH_STARTED_EVENT_ID
} from "@/constants";
import { TiltifyDonationMatchEventData } from "@/events/donation-match-event-data";
import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";


export const TiltifyDonationMatchIsDonatingAllPledgedVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationMatchIsDonatingAllPledged",
        usage: "tiltifyDonationMatchIsDonatingAllPledged",
        description: "Returns true if all of the pledged amount is donated at the end of the match even if not everything has been matched. ",
                triggers: {
                    event: [
                        `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_MATCH_STARTED_EVENT_ID}`,
                        `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_MATCH_ENDED_EVENT_ID}`
                    ],
                    manual: true
                },
        possibleDataOutput: [OutputDataType.BOOLEAN]
    },
    evaluator: function (trigger): boolean {
            const eventData: TiltifyDonationMatchEventData = trigger.metadata
                ?.eventData as TiltifyDonationMatchEventData;
            return eventData.isDonatingAllPledged ?? false;
    }
};