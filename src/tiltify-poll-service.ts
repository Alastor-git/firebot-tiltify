import { TypedEmitter } from "tiny-typed-emitter";
import { logger } from "@shared/firebot-modules";
import { TiltifyCampaignData } from "./types/campaign-data";

interface PollingEvents {
    "polling-started": (campaignId: string) => void;
    "polling-stopped": (campaignId: string) => void;
}

class TiltifyPollService extends TypedEmitter<PollingEvents> {
    private poller: { [campaignId: string]: NodeJS.Timeout };
    private pollingInterval: { [campaignId: string]: number };
    private pollerData: { [campaignId: string]: TiltifyCampaignData };
    private pollerStarted: { [campaignId: string]: boolean };
    private defaultPollingInterval = 15000;

    public setPollingInterval(
        campaignId: string,
        interval: number = this.defaultPollingInterval
    ) {
        this.pollingInterval[campaignId] = interval;
        // If polling is happening, reset the interval
        if (this.poller != null) {
            clearInterval(this.poller[campaignId]);
            this.poller[campaignId] = setInterval(
                () => this.poll(campaignId),
                this.pollingInterval[campaignId]
            );
        }
    }

    private clearPoll(campaignId: string) {
        if (this.poller[campaignId] != null) {
            clearInterval(this.poller[campaignId]);
            delete this.poller[campaignId];
            delete this.pollingInterval[campaignId];
            delete this.pollerStarted[campaignId];
            delete this.pollerData[campaignId];
        }
    }

    private async startPollActions(campaignId: string) {
        // TODO : Include here the actions you need to do only once before the poll starts
    }

    private async poll(campaignId: string) {
        // TODO : Poll here the data from Tiltify
    }

    private async stopPollActions(campaignId: string) {
        // TODO : Include here the actions you need to do only once after the poll ends
    }

    public async start(
        campaignId: string,
        interval: number = this.defaultPollingInterval
    ) {
        this.clearPoll(campaignId);
        this.pollerStarted[campaignId] = true;
        this.startPollActions(campaignId);

        if (!this.pollerStarted[campaignId]) {
            this.clearPoll(campaignId);
            logger.debug(
                `Tiltify: Failed to start polling Tiltify campaign ${campaignId}.`
            );
            this.emit("polling-stopped", campaignId);
            return;
        }

        this.poller[campaignId] = setInterval(
            () => this.poll(campaignId),
            interval
        );

        logger.debug(
            `Tiltify: Started polling Tiltify campaign ${campaignId}.`
        );
        this.emit("polling-started", campaignId);
    }

    public stop(campaignId: string) {
        this.stopPollActions(campaignId);
        this.clearPoll(campaignId);

        logger.debug(
            `Tiltify: Stopped polling Tiltify campaing ${campaignId}.`
        );
        this.emit("polling-stopped", campaignId);
    }

    public stopAll() {
        logger.debug(`Tiltify: Stopping polling for all Tiltify campaigns.`);
        for (const campaignId of Object.keys(this.poller)) {
            this.stop(campaignId);
        }
    }
}
export const tiltifyPollService = new TiltifyPollService();
