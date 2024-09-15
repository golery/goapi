import { Request } from 'express';
export interface Ctx {
    appId: number;
    userId: number;
    groupId?: number;

    apiRequestId: string;
}

export interface ApiRequest extends Request {
    ctx: Ctx;
}
