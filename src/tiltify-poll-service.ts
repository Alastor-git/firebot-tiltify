import { TypedEmitter } from "tiny-typed-emitter";
import { logger } from "@shared/firebot-modules";

interface PollingEvents {
    "polling-started": (campaignId: string) => void;
    "polling-stopped": (campaignId: string) => void;
}

class TiltifyPollService extends TypedEmitter<PollingEvents> {
    private poller: { [campaignId: string]: NodeJS.Timeout };
    private pollingInterval: { [campaignId: string]: number };
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

        this.startPollActions(campaignId);
        this.poller[campaignId] = setInterval(
            () => this.poll(campaignId),
            interval
        );

        this.emit("polling-started", campaignId);
        logger.debug(
            `Tiltify: Started polling Tiltify campaign ${campaignId}.`
        );
    }

    public stop(campaignId: string) {
        this.clearPoll(campaignId);
        this.stopPollActions(campaignId);

        this.emit("polling-stopped", campaignId);
        logger.debug(
            `Tiltify: Stopped polling Tiltify campaing ${campaignId}.`
        );
    }

    public stopAll() {
        logger.debug(`Tiltify: Stopping polling for all Tiltify campaigns.`);
        for (const campaignId of Object.keys(this.poller)) {
            this.stop(campaignId);
        }
    }
}
export const tiltifyPollService = new TiltifyPollService();
