import { EventFilter } from "@crowbartools/firebot-custom-scripts-types/types/modules/event-filter-manager";
import {
    TILTIFY_EVENT_SOURCE_ID,
    TILTIFY_DONATION_EVENT_ID,
    TILTIFY_DONATION_FILTER_ID
} from "../constants";
import { TiltifyDonationEventData } from "@/events/donation-event-data";

export const DonationFilter: EventFilter = {
    id: TILTIFY_DONATION_FILTER_ID,
    name: "Tiltify Donation",
    description: "Filter donation that are a match ending.",
    events: [
        {
            eventSourceId: TILTIFY_EVENT_SOURCE_ID,
            eventId: TILTIFY_DONATION_EVENT_ID
        }
    ],
    comparisonTypes: ["is", "is not"],
    valueType: "preset",
    predicate: (filterSettings, eventData) => {
        const eventMetaData = eventData.eventMeta as TiltifyDonationEventData;

        switch (filterSettings.comparisonType) {
            case 'is':
                return Promise.resolve(eventMetaData.isMatchDonation);
            case 'is not':
                return Promise.resolve(!eventMetaData.isMatchDonation);
            default:
                return Promise.resolve(false);
        }
    },
    presetValues: async () => {
        return [
            { value: "match ending", display: "Match Ending"}
        ];
    }
};
