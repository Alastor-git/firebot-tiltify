export type FirebotEvent = {
    id: string;
    name: string;
    description: string;
    cached?: boolean;
    manualMetadata?: Record<string, unknown>;
}