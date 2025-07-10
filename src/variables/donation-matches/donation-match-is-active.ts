import { TILTIFY_INTEGRATION_ID } from "@/constants";
import { tiltifyPollService } from "@/services";
import { integrationManager } from "@/shared/firebot-modules";
import { TiltifySettings } from "@/tiltify-integration";
import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";


export const TiltifyDonationMatchIsActiveVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationMatchIsActive",
        usage: "tiltifyDonationMatchIsActive[Id]",
        description: "Returns whether the Id corresponds to an active match or not. Null if the match doesn't exist or the campaign isn't connected. ",
        possibleDataOutput: [OutputDataType.BOOLEAN, OutputDataType.NULL]
    },
    evaluator: function (trigger, matchId): boolean | null {
        const campaignId: string = integrationManager.getIntegrationUserSettings<TiltifySettings>(TILTIFY_INTEGRATION_ID).campaignSettings.campaignId;
        const pollerData = tiltifyPollService().pollerData;

        // Validate matchId's type
        if (typeof matchId !== 'string') {
            return null;
        }
        // Validate that we're connected to the campaign
        if (!(campaignId in pollerData)) {
            return null;
        }
        // Validate that the matchId corresponds to an existing match
        if (!(matchId in pollerData[campaignId].donationMatches)) {
            return null;
        }

        return pollerData[campaignId].donationMatches[matchId].active;
    }
};