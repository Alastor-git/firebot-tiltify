import { TILTIFY_INTEGRATION_ID } from "@/constants";
import { tiltifyPollService } from "@/services";
import { integrationManager } from "@/shared/firebot-modules";
import { TiltifySettings } from "@/tiltify-integration";
import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";


export const TiltifyDonationMatchGetIdsVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationMatchGetIds",
        usage: "tiltifyDonationMatchGetIds",
        description: "The Array of Ids of the donation matches known for the active campaign. Null if the campaign is not being polled. ",
        possibleDataOutput: [OutputDataType.ARRAY, OutputDataType.NULL]
    },
    evaluator: function (): string[] | null {
        const campaignId: string = integrationManager.getIntegrationUserSettings<TiltifySettings>(TILTIFY_INTEGRATION_ID).campaignSettings.campaignId;
        const pollerData = tiltifyPollService().pollerData;

        if (!(campaignId in pollerData)) {
            return null;
        }

        const donationMatchIds: string[] = Object.keys(pollerData[campaignId].donationMatches);
        return donationMatchIds;
    }
};