
import { z } from 'zod';
export const SignUpRequestSchema = z.object({
    appId: z.number(),
    email: z.string(),
    password: z.string(),
});

export interface SignUpResponse {
    appId: number,
    userId: string,
    token: string,
}

export const SignInRequestSchema = z.object({
    appId: z.number(),
    email: z.string(),
    password: z.string(),
});


export interface SignInResponse {
    appId: number,
    userId: string,
    token: string,
}