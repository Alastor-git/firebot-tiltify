import { TILTIFY_INTEGRATION_ID } from "@/constants";
import { tiltifyPollService } from "@/services";
import { integrationManager } from "@/shared/firebot-modules";
import { TiltifySettings } from "@/tiltify-integration";
import { TiltifyDonationMatch } from "@/types/donation-match";
import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { OutputDataType } from "@shared/variable-constants";


export const TiltifyDonationMatchGetActiveIdsVariable: ReplaceVariable = {
    definition: {
        handle: "tiltifyDonationMatchGetActiveIds",
        usage: "tiltifyDonationMatchGetActiveIds",
        description: "The Array of Ids of the active donation matches known for the active campaign. Null if the campaign is not being polled. ",
        possibleDataOutput: [OutputDataType.ARRAY, OutputDataType.NULL]
    },
    evaluator: function (): string[] | null {
        const campaignId: string = integrationManager.getIntegrationUserSettings<TiltifySettings>(TILTIFY_INTEGRATION_ID).campaignSettings.campaignId;
        const pollerData = tiltifyPollService().pollerData;

        if (!(campaignId in pollerData)) {
            return null;
        }

        const donationMatches: TiltifyDonationMatch[] = Object.values(pollerData[campaignId].donationMatches);
        return donationMatches.filter(match => match.active).map(match => match.id);
    }
};