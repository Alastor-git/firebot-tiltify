import { TypedEmitter } from "tiny-typed-emitter";
import { logger } from "@shared/firebot-modules";

interface PollingEvents {
    "polling-started": (campaignId: string) => void;
    "polling-stopped": (campaignId: string) => void;
}

export abstract class AbstractPollService extends TypedEmitter<PollingEvents> {
    private poller: { [campaignId: string]: NodeJS.Timeout };
    private pollingInterval: { [campaignId: string]: number };
    protected pollerData: { [campaignId: string]: unknown };
    protected pollerStarted: { [campaignId: string]: boolean };
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

    protected abstract startPollActions(campaignId: string): Promise<void>;
    protected abstract poll(campaignId: string): Promise<void>;
    protected abstract stopPollActions(campaignId: string): void;

    public async start(
        campaignId: string,
        interval: number = this.defaultPollingInterval
    ) {
        this.clearPoll(campaignId);
        this.pollerStarted[campaignId] = true;
        await this.startPollActions(campaignId);

        if (!this.pollerStarted[campaignId]) {
            logger.debug(
                `Tiltify: Failed to start polling Tiltify campaign ${campaignId}.`
            );
            this.stop(campaignId);
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
        this.pollerStarted[campaignId] = false;
        this.stopPollActions(campaignId);
        this.clearPoll(campaignId);
        delete this.poller[campaignId];
        delete this.pollingInterval[campaignId];
        delete this.pollerStarted[campaignId];
        delete this.pollerData[campaignId];

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

    public isStarted(campaignId: string): boolean {
        return !!this.pollerStarted[campaignId];
    }
}
