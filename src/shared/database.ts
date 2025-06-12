import { JsonDB, Config } from "node-json-db";
import { logger } from "@shared/firebot-modules";
import { tiltifyIntegration } from "@/services";
import { unlink } from "fs/promises";

/**
 * Description placeholder
 *
 * @export
 * @class TiltifyDatabase
 * @typedef {TiltifyDatabase}
 */
export class TiltifyDatabase {
    /**
     * Description placeholder
     *
     * @private
     * @type {(JsonDB | null)}
     */
    private db: JsonDB | null = null;

    /**
     * Creates an instance of TiltifyDatabase.
     *
     * @constructor
     * @param {string} path
     * @throws {Error} if the database couldn't be loaded
     */
    constructor(path: string) {
        this.load(path).catch((error): Promise<never> => {
            throw error;
        });
    }

    /**
     * Description placeholder
     *
     * @async
     * @param {string} path
     * @returns {Promise<void>}
     * @throws {Error} if the database couldn't be loaded
     */
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
                throw Error("Tiltify : Database not loaded.");
            }
        }
    }

    /**
     * Description placeholder
     *
     * @async
     * @param {string} path
     * @returns {Promise<unknown>}
     * @throws {Error} if the database isn't initialized
     */
    async get(path: string): Promise<unknown> {
        if (this.db === null) {
            logger.warn(
                `Tiltify : Database not loaded. ${path} could not be retrieved. `
            );
            logger.debug("Tiltify : Disconnecting Tiltify.");
            tiltifyIntegration().disconnect();
            throw Error("Tiltify: Database not initialized");
        }
        return await this.db.getData(path);
    }

    /**
     * Description placeholder
     *
     * @param {string} path
     * @param {unknown} object
     * @throws {Error} if the database does not exist
     * @throws {DataError} if database can't be written
     */
    set(path: string, object: unknown): void {
        if (this.db === null) {
            logger.warn(
                `Tiltify : Database not loaded. ${path} could not be saved. `
            );
            logger.debug("Tiltify : Disconnecting Tiltify.");
            tiltifyIntegration().disconnect();
            throw Error("Tiltify: Database not initialized");
        }
        this.db.push(path, object);
    }
}
