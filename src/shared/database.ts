import { JsonDB, Config } from "node-json-db";
import { logger } from "@shared/firebot-modules";
import { tiltifyIntegration } from "@/services";
import { unlink } from "fs/promises";

export class TiltifyDatabase {
    private db: JsonDB | null = null;

    constructor(path: string) {
        this.load(path);
    }

    async load(path: string): Promise<void> {
        logger.debug(`Loading Tiltify database at ${path}`);
        this.db = new JsonDB(new Config(path, true, false, "/"));
        // Merge Push an empty database to initialize the database if necessary
        try {
            await this.db.push(`/`, { tiltify: {} }, false);
        } catch {
            try {
                logger.warn(
                    "Tiltify : Tiltify database corrupted. Attempting to reset it"
                );
                await unlink(path);
                await this.db.push(`/`, { tiltify: {} }, false);
            } catch {
                logger.warn("Tiltify : Tiltify database could not be reset. ");
                logger.warn("Tiltify : Database not loaded.");
                this.db = null;
            }
        }
    }

    async get(path: string): Promise<unknown> {
        if (this.db === null) {
            logger.warn(
                `Tiltify : Database not loaded. ${path} could not be retrieved. `
            );
            logger.debug("Tiltify : Disconnecting Tiltify.");
            tiltifyIntegration().emit(
                "disconnected",
                tiltifyIntegration().integrationId
            );
            tiltifyIntegration().connected = false;
            return;
        }
        return await this.db.getData(path);
    }

    set(path: string, object: unknown): void {
        if (this.db === null) {
            logger.warn(
                `Tiltify : Database not loaded. ${path} could not be saved. `
            );
            logger.debug("Tiltify : Disconnecting Tiltify.");
            tiltifyIntegration().emit(
                "disconnected",
                tiltifyIntegration().integrationId
            );
            tiltifyIntegration().connected = false;
            return;
        }
        this.db.push(path, object);
    }
}
