import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_DONATION_EVENT_ID
} from "@/constants";
import { TiltifyDonationEventData } from "@/events/donation-event-data";

export const TiltifyDonationMatchIdsVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationMatchIds",
        usage: "tiltifyDonationMatchIds",
        description: "The Array of Ids the matches for this donation. ",
        triggers: {
            event: [`${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_DONATION_EVENT_ID}`],
            manual: true
        },
        possibleDataOutput: [OutputDataType.ARRAY]
    },
    evaluator: function (trigger): string[] {
        const eventData: TiltifyDonationEventData = trigger.metadata
            ?.eventData as TiltifyDonationEventData;
        return eventData?.matches.map(match => match.id) ?? [];
    }
};