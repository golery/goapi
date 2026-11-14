
import { z } from 'zod';
export const SignUpRequestSchema = z.object({
    appId: z.number().optional(),
    email: z.string(),
    password: z.string(),
});

export const SignInRequestSchema = z.object({
    appId: z.number().optional(),
    email: z.string(),
    password: z.string(),
});


export interface GroupSummary {
    id: number,
    name: string | null,
    role: 'owner' | 'staff',
}

export interface SignInResponse {
    appId: number,
    userId: number,
    token: string,
    email: string,
    firstName?: string,
    lastName?: string,
    picture?: string,
    groupIds: number[],
    groups: GroupSummary[],
}

export const SignInGoogleRequestSchema = z.object({
    appId: z.number().optional(),
    idToken: z.string(),
});

export const SecretsSchema = z.object({
    accessTokenSecret: z.string(),
    superAdminPassword: z.string(),
    postgresUrl: z.string(),
});

export const CreateGroupRequestSchema = z.object({
    name: z.string(),
});

export const PatchGroupRequestSchema = z.object({
    name: z.string(),
});

export const JoinGroupRequestSchema = z.object({
    code: z.string(),
});

export const PatchMemberRoleRequestSchema = z.object({
    role: z.enum(['owner', 'staff']),
});


export interface GetUserResponse {
    email: string,
    appId: number,
    firstName?: string,
    lastName?: string,
    picture?: string,
    groupIds: number[],
    groups: GroupSummary[],
}

export interface CreateGroupResponse {
    appId: number,
    id: number,
}

export interface UploadFileResponse {
    key: string,
}

export const ChatMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
});

const httpUrl = z.string().trim().max(2000).refine((value) => {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}, 'Must be an http(s) URL');

export const AcceptLegalRequestSchema = z.object({
    terms: httpUrl,
    privacy: httpUrl,
});

export const ChatRequestSchema = z.object({
    question: z.string().min(1),
    chatHistory: z.array(ChatMessageSchema).optional(),
    nodeTree: z.array(z.number()).optional(),
});

const stockId = z.string().trim().min(1).max(200);
const stockQty = z.number().positive().finite();

const stockReceive = z.object({
    opId: z.string().uuid(),
    v: z.literal(1),
    type: z.literal('receive'),
    at: z.number().int(),
    productId: stockId,
    storageId: stockId,
    quantity: stockQty,
});

const stockSell = stockReceive.extend({ type: z.literal('sell') });

const stockMove = z.object({
    opId: z.string().uuid(),
    v: z.literal(1),
    type: z.literal('move'),
    at: z.number().int(),
    productId: stockId,
    fromStorageId: stockId,
    toStorageId: stockId,
    quantity: stockQty,
});

const stockCount = z.object({
    opId: z.string().uuid(),
    v: z.literal(1),
    type: z.literal('count'),
    at: z.number().int(),
    storageId: stockId,
    lines: z.array(z.object({
        productId: stockId,
        seen: z.number().nonnegative().finite(),
        expected: z.number().finite(),
    })).min(1),
});

export const StockPushSchema = z.object({
    deviceId: z.string().uuid(),
    deviceSeq: z.number().int().positive(),
    baseSeq: z.number().int().nonnegative(),
    deviceNow: z.number().int().optional(),
    op: z.discriminatedUnion('type', [stockReceive, stockSell, stockMove, stockCount]),
}).superRefine((value, ctx) => {
    if (value.op.type === 'move' && value.op.fromStorageId === value.op.toStorageId) {
        ctx.addIssue({ code: 'custom', message: 'fromStorageId and toStorageId must differ' });
    }
    if (value.op.type === 'count') {
        const ids = value.op.lines.map((line) => line.productId);
        if (new Set(ids).size !== ids.length) {
            ctx.addIssue({ code: 'custom', message: 'count lines must name each product once' });
        }
    }
});

export const StockPullQuerySchema = z.object({
    after: z.coerce.number().int().nonnegative().default(0),
});

export type StockPushRequest = z.infer<typeof StockPushSchema>;

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
