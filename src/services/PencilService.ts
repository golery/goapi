import {node, PrismaClient, space} from '@prisma/client';
import {getConnection, getRepository} from 'typeorm';
import {Book} from '../entity/Book';
import {Node} from '../entity/Node';

const prisma = new PrismaClient();

const APP_PENCIL = 1;
export interface CreateSpaceRequest {
    userId: string;
    name: string;
    code: string;
}
export class PencilService {
    async getBooks() {
        const bookRepo = getRepository(Book);
        return await bookRepo.find();
    }

    async getBook(bookId: number) {
        const nodeRepo = getRepository(Node);
        return await nodeRepo.find({where: {app: 1}});
    }

    async createSpace(request: CreateSpaceRequest) {
        const book = await prisma.space.create({
            data: {
                id: undefined,
                code: request.code,
                name: request.name,
                rootId: 123,
            }
        });
        const node: node = await prisma.node.create({data:{
            app: APP_PENCIL,
            name: request.name,
            title: request.name,
            userId: '1',
            space: book.id,
        }});
        return book;
    }
}