
import { z } from 'zod';
export const SignUpRequestSchema = z.object({
    appId: z.number(),
    email: z.string(),
    password: z.string(),
});

export interface SignUpResponse {
    appId: number,
    userId: number,
    token: string,
    email: string,
}

export const SignInRequestSchema = z.object({
    appId: z.number(),
    email: z.string(),
    password: z.string(),
});


export interface SignInResponse {
    appId: number,
    userId: number,
    token: string,
    email: string,
}

export const SignInGoogleRequestSchema = z.object({
    appId: z.number(),
    accessToken: z.string(),    
});

export const SecretsSchema = z.object({
    accessTokenSecret: z.string(),
    superAdminPassword: z.string(),
    postgresUrl: z.string(),
});
