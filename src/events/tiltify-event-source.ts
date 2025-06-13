import { EventSource } from "@crowbartools/firebot-custom-scripts-types/types/modules/event-manager";
import { TILTIFY_EVENT_SOURCE_ID } from "../constants";
import { TiltifyDonationEvent } from "./donation-event-data";
import { TiltifyMilestoneReachedEvent } from "./milestone-reached-event-data";

export const TiltifyEventSource: EventSource = {
    id: TILTIFY_EVENT_SOURCE_ID,
    name: "Tiltify",
    events: [
        TiltifyDonationEvent,
        TiltifyMilestoneReachedEvent
    ]
};
