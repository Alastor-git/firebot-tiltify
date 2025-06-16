export class TiltifyIntegrationError extends Error {
    originalMessage: string = '';

    constructor(message: string, options?: ErrorOptions) {
        super(`${message}`, options);
        this.originalMessage = message;

        this.name = "TiltifyIntegrationError";

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, TiltifyIntegrationError.prototype);
    }
}

export class PollerError extends TiltifyIntegrationError {
    constructor(message: string, options?: ErrorOptions) {
        super(`Poller error: ${message}`, options);
        this.originalMessage = message;

        this.name = "PollerError";

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, PollerError.prototype);
    }
}

export class TiltifyAPIError extends TiltifyIntegrationError {
    errorCode: number;

    constructor(errorCode: number, message: string, options?: ErrorOptions) {
        super(`API error ${errorCode}: ${message}`, options);
        this.originalMessage = message;
        this.errorCode = errorCode;

        this.name = "TiltifyAPIError";

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, TiltifyAPIError.prototype);
    }
}