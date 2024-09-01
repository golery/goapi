
import { z } from 'zod';
export const SignUpRequestSchema = z.object({
    appId: z.number(),
    email: z.string(),
    password: z.string(),
});
export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;

export const SignUpResponseSchema = z.object({
    appId: z.number(),
    userId: z.string(), 
    token: z.string(),
})
export type SignUpResponse = z.infer<typeof SignUpResponseSchema>;

export const SignInRequestSchema = z.object({
    appId: z.number(),
    email: z.string(),
    password: z.string(),
});
export type SignInRequest = z.infer<typeof SignInRequestSchema>;

export const SignInResponseSchema = z.object({
    appId: z.number(),
    userId: z.string(),
    token: z.string(),
});
export type SignInResponse = z.infer<typeof SignInResponseSchema>;