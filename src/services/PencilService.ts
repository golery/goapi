import {getConnection, getRepository} from 'typeorm';
import {Book} from '../entity/Book';
import {Node} from '../entity/Node';
import {createHook} from 'async_hooks';
import {BadRequestError} from '../util/exceptions';

const APP_PENCIL = 1;

export interface CreateSpaceRequest {
    userId: string;
    name: string;
    code: string;
}

const USER_ID = '1';

export class PencilService {
    async moveNode(nodeId: number, request: { newBookId?: number, newParentId: number, pos: number }) {
        const {newBookId, newParentId, pos} = request;
        const nodeRepo = getRepository(Node);
        const node = await nodeRepo.findOne(nodeId);
        const parent = await nodeRepo.findOne(node.parentId);

        const newParent = await nodeRepo.findOne(newParentId);
        let childList = (newParent.children || []);
        if (!childList.includes(node.id)) {
            if (childList.length >= pos) {
                childList.splice(pos, 0, node.id);
            } else {
                childList = [...childList, node.id];
            }
        }

        console.log(`Moved node ${nodeId} from ${node.parentId} to ${newParent}`);
        console.log(`Before update. parent${parent.id}.children`, parent.children, parent.children.filter(childId => childId != node.id));
        console.log(`Before update. newParent${newParent.id}.children`, newParent.children);

        await Promise.all([nodeRepo.update(parent.id, {children: parent.children.filter(childId => childId != node.id)}),
            nodeRepo.update(newParent.id, {children: childList}),
            nodeRepo.update(node.id, {parentId: newParentId})]);


        console.log(`Old Parent ${parent.id}.children`, (await nodeRepo.findOne(node.parentId)).children);
        console.log(`New Parent ${newParent.id} .children`, (await nodeRepo.findOne(newParentId)).children);
        //        await nodeRepo.update(node.id, { parentId: newParentId});
        return node;
    }

    async getBooks() {
        const bookRepo = getRepository(Book);
        return await bookRepo.find({order: {order: 'ASC'}});
    }

    async query(bookId: number) {
        const nodeRepo = getRepository(Node);
        return await nodeRepo.find({where: {app: 1, bookId}});
    }

    private async generateNodeId(): Promise<number> {
        const connection = getConnection();
        const {nodeId} = await connection.createQueryBuilder().select('nextval(\'seq_node_id\')', 'nodeId').from('seq_node_id', 'seq').getRawOne();
        return parseInt(nodeId);
    }
    async createBook(request: CreateSpaceRequest) {
        const connection = getConnection();
        const nodeId = await this.generateNodeId();
        const {bookId} = await connection.createQueryBuilder().select('max(id)+1', 'bookId').from('space', 'space').getRawOne();
        const nodeRepo = getRepository(Node);
        const node = await nodeRepo.save({
            id: nodeId,
            app: APP_PENCIL,
            userId: USER_ID,
            bookId,

            name: request.name,
            title: request.name,
        });
        const bookRepo = getRepository(Book);
        const book = await bookRepo.save({
            id: bookId,
            code: request.code,
            rootId: node.id,
            name: request.name,
        });
        return {book, node};
    }

    async addNode(parentId: number, position: number = 0): Promise<Node> {
        const repo = await getRepository(Node);
        const parent = await repo.findOne(parentId);
        if (!parent) {
            throw new BadRequestError(`Invalid parentId ${parentId}`);
        }

        const nodeId = await this.generateNodeId();
        const createNode: Partial<Node> = {
            id: nodeId,
            userId: USER_ID,
            app: APP_PENCIL,
            parentId: parentId,
            bookId: parent.bookId,
        };

        const node = await repo.save(createNode);

        const children = parent.children ?? [];
        if (children.length < position) {
            children.push(node.id);
        } else {
            children.splice(position, 0, node.id);
        }
        parent.children = children;
        await repo.save(parent);
        console.log(`Added node ${nodeId}`);
        return node;
    }

    async updateNode(node: Node): Promise<Node> {
        const repo = await getRepository(Node);
        const existing = await repo.findOne(node.id);
        delete node.userId;
        delete node.app;
        delete node.createTime;
        delete node.updateTime;
        console.log('Update', existing, node);
        return await repo.save({...existing, ...node});
    }
}
