import { Request } from 'express';
export interface Ctx {
    appId: number;
    userId: number;
    groupId?: number;
}

export interface ApiRequest extends Request {
    ctx: Ctx;
}
