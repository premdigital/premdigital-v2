// src/types/index.ts

export interface XrayClient {
    id?: string;
    password?: string;
    email: string;
    alterId?: number;
}

export interface XrayConfig {
    inbounds: Array<{
        port: number;
        protocol: string;
        settings: {
            clients: XrayClient[];
        };
    }>;
}

export interface UserAccount {
    username: string;
    expiredAt: string;
    uuidOrPass: string;
}