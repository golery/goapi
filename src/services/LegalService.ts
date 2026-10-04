import { LegalAcceptance } from '../entity/LegalAcceptance.entity';
import { AcceptLegalRequestSchema } from '../types/schemas';
import { Ctx } from '../types/context';
import { ServerError } from '../utils/errors';
import { getEm } from './db';

type IpRequest = {
    ip?: string;
    headers: { [key: string]: string | string[] | undefined };
    socket?: { remoteAddress?: string | undefined };
};

export function clientIp(req: IpRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (raw) {
        const first = raw.split(',')[0]?.trim();
        if (first) {
            return first.slice(0, 64);
        }
    }
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip.slice(0, 64);
}

export async function acceptLegal(ctx: Ctx, body: unknown, ipAddress: string) {
    const parsed = AcceptLegalRequestSchema.safeParse(body);
    if (!parsed.success) {
        throw new ServerError(400, 'Invalid request');
    }
    if (!ipAddress) {
        throw new ServerError(400, 'IP address is required');
    }

    const row = new LegalAcceptance();
    row.userId = ctx.userId;
    row.app = parsed.data.app;
    row.terms = parsed.data.terms;
    row.privacy = parsed.data.privacy;
    row.ipAddress = ipAddress;
    row.acceptedAt = new Date();

    await getEm().persistAndFlush(row);

    return {
        id: row.id,
        userId: row.userId,
        app: row.app,
        terms: row.terms,
        privacy: row.privacy,
        ipAddress: row.ipAddress,
        acceptedAt: row.acceptedAt.toISOString(),
    };
}
