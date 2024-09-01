
import { z } from 'zod';
export const SignUpRequestSchema = z.object({
    email: z.string(),
    password: z.string(), 
 });
 export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;

 export const SignUpResponseSchema = z.object({
     userId: z.string(),
 })
 export type SignUpResponse = z.infer<typeof SignUpResponseSchema>;
 