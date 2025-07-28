import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_DONATION_EVENT_ID
} from "@/constants";
import { TiltifyDonationEventData } from "@/events/donation-event-data";

export const TiltifyDonationIsMatchVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationIsMatch",
        usage: "tiltifyDonationIsMatch",
        description: "Is the donation resulting from a donation match ending ? ",
        triggers: {
            event: [
                `${TILTIFY_EVENT_SOURCE_ID}:${TILTIFY_DONATION_EVENT_ID}`
            ],
            manual: true
        },
        possibleDataOutput: [OutputDataType.BOOLEAN]
    },
    evaluator: function (trigger): boolean {
        const eventData: TiltifyDonationEventData = trigger.metadata
            ?.eventData as TiltifyDonationEventData;
        return eventData?.isMatchDonation ?? false;
    }
};