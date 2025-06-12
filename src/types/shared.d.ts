export type TiltifyApiResponse<T> = {
    data: T;
};

export type TiltifyMoney = {
    currency: string;
    value: string;
} | null;

export type RemoveOptionnal<T, K extends keyof T> = T & {
    [P in K]: Exclude<T[P], undefined>;
};

export type SetOptionnal<T, K extends keyof T> = {
    [P in keyof T]: P extends K ? T[P] | undefined : T[P];
};
