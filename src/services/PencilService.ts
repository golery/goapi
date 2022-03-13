import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PencilService {
    async getBooks() {
        const books = await prisma.space.findMany();
        return books;
    }
}