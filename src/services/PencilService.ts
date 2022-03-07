import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PencilService {
    async getBooks() {
        // const allUsers = await prisma.user.findMany({
        //     include: { posts: true },
        // })
        // // use `console.dir` to print nested objects
        // console.dir(allUsers, { depth: null })
        return [1,2];
    }
}