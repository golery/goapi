import {node, PrismaClient} from '@prisma/client';
import * as typeorm from 'typeorm';
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

const USER_ID = '1';

export class PencilService {
    async getBooks() {
        const bookRepo = getRepository(Book);
        return await bookRepo.find();
    }

    async getBook(bookId: number) {
        const nodeRepo = getRepository(Node);
        return await nodeRepo.find({where: {app: 1, bookId}});
    }

    async createBook(request: CreateSpaceRequest) {
        const connection = getConnection();
        const {nodeId} = await connection.createQueryBuilder().select('nextval(\'seq_node_id\')', 'nodeId').from('seq_node_id', 'seq').getRawOne();
        const {bookId} = await connection.createQueryBuilder().select('max(id)+1', 'bookId').from('space', 'space').getRawOne();
        const nodeRepo = getRepository(Node);
        const node = await nodeRepo.save({
            app: APP_PENCIL,
            bookId,
            id: nodeId,
            name: request.name,
            title: request.name,
            userId: USER_ID,

        });
        const bookRepo = getRepository(Book);
        const book = await bookRepo.save({
            code: request.code,
            id: bookId,
            rootId: node.id,
            name: request.name,
        });
        return {book, node};
    }
}