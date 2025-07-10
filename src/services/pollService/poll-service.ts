import { TypedEmitter } from "tiny-typed-emitter";
import { logger } from "@/tiltify-logger";

interface PollingEvents {
    "polling-started": (campaignId: string) => void;
    "polling-stopped": (campaignId: string) => void;
}

type PollerStatus = {
    lastPollingTimestamp: number;
    retryAttempt: number;
    retryMode: "None" | "Backoff" | "Once" | "Shutdown";
};

export type PollingOptions = {
    /**
     * Interval in ms between 2 polling cycles
     *
     */
    pollingInterval: number;
    /**
     * Maximum number of allowed retries in case of connection failure
     *
     */
    maxRetries: number;
    /**
     * Maximum retry delay in case of connection failure in ms
     *
     */
    maxDelay: number;
    /**
     * Initial retry delay in case of connection failure in ms
     *
     */
    initalDelay: number
};

export abstract class AbstractPollService<Options extends PollingOptions = PollingOptions> extends TypedEmitter<PollingEvents> {
    private poller: { [campaignId: string]: NodeJS.Timeout } = {};
    protected pollingOptions: { [campaignId: string]: Options} = {};
    protected pollerData: { [campaignId: string]: unknown } = {};
    protected pollerStarted: { [campaignId: string]: boolean } = {};
    protected pollerStatus: { [campaignId: string]: PollerStatus } = {};
    protected defaultPollingOptions: Options;

    protected static getDefaultPollingOptions(): PollingOptions {
        const options: PollingOptions = {
            pollingInterval: 15000, // Default polling interval in ms
            maxRetries: 12, // Maximum number of allowed retries
            maxDelay: 900000, // Maximum retry delay in ms
            initalDelay: 2000 // Initial retry delay in ms
        };
        return options;
    }

    public constructor(getDefaultPollingOptions: () => Options) {
        super();
        this.defaultPollingOptions = getDefaultPollingOptions();
    }

    // TODO: Shouldn't this be used instead of reconnecting when changing options ? 
    public setPollingOptions(
        campaignId: string,
        pollingOptions: Partial<Options>,
        resetPoller: boolean = false
    ) {
        // Reset the moller if the pollingInterval has changed or if we forced it
        resetPoller ||=
            campaignId in this.pollingOptions
            && 'pollingInterval' in pollingOptions
            && this.pollingOptions[campaignId].pollingInterval !== pollingOptions.pollingInterval;
        // Update the options with therequested changes
        this.pollingOptions[campaignId] = {
            ...this.pollingOptions[campaignId],
            ...pollingOptions
        };

        // If polling is happening and a reset is required, reset the interval
        if (this.poller != null && resetPoller) {
            clearInterval(this.poller[campaignId]);
            this.poller[campaignId] = setInterval(
                () => this.poll(campaignId),
                this.pollingOptions[campaignId].pollingInterval
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
        pollingOptions: Partial<Options>
    ) {
        this.clearPoll(campaignId);
        this.pollingOptions[campaignId] = {
            ...this.defaultPollingOptions,
            ...pollingOptions
        };

        this.pollerStarted[campaignId] = true;
        await this.startPollActions(campaignId);

        if (!this.pollerStarted[campaignId]) {
            logger.debug(
                `Failed to start polling Tiltify campaign ${campaignId}.`
            );
            this.stop(campaignId);
            return;
        }

        this.pollerStatus[campaignId] = {
            lastPollingTimestamp: 0,
            retryAttempt: 0,
            retryMode: "None"
        };
        this.poller[campaignId] = setInterval(
            () => this.abstractPoll(campaignId),
            this.pollingOptions[campaignId].pollingInterval
        );

        logger.debug(
            `Started polling Tiltify campaign ${campaignId}.`
        );
        this.emit("polling-started", campaignId);
    }

    private async abstractPoll(campaignId: string): Promise<void> {
        // Silently give up if the poller is stopped
        if (!this.pollerStarted[campaignId]) {
            return;
        }

        const pollerStatus = this.pollerStatus[campaignId];
        const pollingOptions: Options = this.pollingOptions[campaignId];
        // Check if we exceeded the max number of retries
        if (pollerStatus.retryMode === "Once" && pollerStatus.retryAttempt >= 1) {
            pollerStatus.retryMode = "Shutdown";
            logger.info(`Shutting down campaign ${campaignId} after failing to poll twice.`);
        } else if (pollerStatus.retryMode === "Backoff" && pollerStatus.retryAttempt > pollingOptions.maxRetries) {
            pollerStatus.retryMode = "Shutdown";
            logger.info(`Shutting down campaign ${campaignId} after too many errors.`);
        }

        // Shut down the campaign if required
        if (pollerStatus.retryMode === "Shutdown") {
            this.stop(campaignId);
            return;
        }

        // If we're in a retry mode, wait for the appropriate delay before attempting to poll again
        if (pollerStatus.retryMode !== "None") {
            const retryDelay: number = Math.min(pollingOptions.initalDelay * 2 ** pollerStatus.retryAttempt, pollingOptions.maxDelay);
            if (pollerStatus.lastPollingTimestamp + retryDelay > Date.now()) {
                return;
            }
            logger.debug(`Polling retry #${pollerStatus.retryAttempt} happening after ${retryDelay / 1000}s.`);
            pollerStatus.retryAttempt++;
        }
        await this.poll(campaignId);
        pollerStatus.lastPollingTimestamp = Date.now();
        if (pollerStatus.retryMode === "Once" || (pollerStatus.retryMode === "Backoff" && pollerStatus.retryAttempt <= pollingOptions.maxRetries)) {
            const retryDelay: number = Math.min(pollingOptions.initalDelay * 2 ** pollerStatus.retryAttempt, pollingOptions.maxDelay);
            logger.info(`Polling retry #${pollerStatus.retryAttempt} in ${retryDelay / 1000}s.`);
        }
    }

    protected pollingSuccess(campaignId: string): void {
        if (this.pollerStatus[campaignId].retryMode !== "None") {
            logger.info(`Reconnecting of campaign ${campaignId} successful.`);
        }
        this.pollerStatus[campaignId].retryMode = "None";
        this.pollerStatus[campaignId].retryAttempt = 0;
    }

    public stop(campaignId: string) {
        this.pollerStarted[campaignId] = false;
        this.stopPollActions(campaignId);
        this.clearPoll(campaignId);
        delete this.poller[campaignId];
        delete this.pollingOptions[campaignId];
        delete this.pollerStarted[campaignId];
        delete this.pollerData[campaignId];
        delete this.pollerStatus[campaignId];

        logger.debug(
            `Stopped polling Tiltify campaing ${campaignId}.`
        );
        this.emit("polling-stopped", campaignId);
    }

    public stopAll() {
        logger.debug(`Stopping polling for all Tiltify campaigns.`);
        for (const campaignId of Object.keys(this.poller)) {
            this.stop(campaignId);
        }
    }

    public isStarted(campaignId: string): boolean {
        return !!this.pollerStarted[campaignId];
    }
}
