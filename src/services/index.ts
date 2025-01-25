import { TiltifyPollService } from "./pollService/tiltify-poll-service";
import { TiltifyAPIController } from "./tiltifyAPI/tiltify-remote";
import { TiltifyIntegration } from "@/tiltify-integration";

export const tiltifyPollService: () => TiltifyPollService =
    TiltifyPollService.instance;
export const tiltifyAPIController: () => TiltifyAPIController =
    TiltifyAPIController.instance;
export const tiltifyIntegration: (
    integrationId?: string
) => TiltifyIntegration = TiltifyIntegration.instance;
