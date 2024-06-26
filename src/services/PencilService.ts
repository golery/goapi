import {Node} from '../entity/Node';
import {BadRequestError} from '../util/exceptions';
import {dataSource, bookRepo, nodeRepo} from './Init';
import {Repository} from 'typeorm';

const APP_PENCIL = 1;

export interface CreateSpaceRequest {
    userId: string;
    name: string;
    code: string;
}

const USER_ID = '1';


const applyRecursively = async (nodeId: number, apply: (nodeId: number) => Promise<Node>) => {
    const node = await apply(nodeId);
    if (!node.children) {
        return node;
    }

    console.log(`Apply recursively for child ${node.children}`);
    await Promise.allSettled(node.children.map(childId => applyRecursively(childId, apply)));
    return node;
};

const findSubTreeNodeIds = async (nodeId: number, nodeRepo: Repository<Node>): Promise<number[] | null> => {
    if (!nodeId) {
        return null;
    }
    const node = await nodeRepo.findOne({where: {id: nodeId}});
    if (!node) {
        return null;
    }
    const childrenIds = node.children ? await Promise.all(node.children.map(async (childId) => {
        const result = await findSubTreeNodeIds(childId, nodeRepo);
        if (!result) {
            console.log(`Node ${nodeId} contains invalid children ${childId}. Skip deleting.`, node.children);
            return [];
        }
    })) : [];
    return [node.id, ...childrenIds.flat()];
};


export class PencilService {
    async getPublishedBook() {
        return await bookRepo.findOne({where: {code: 'publish'}});
    }

    async getPublicNodeIds(): Promise<number[]> {
        const book = await this.getPublishedBook();
        const nodes = await nodeRepo.find({where: {bookId: book.id}});
        return nodes.map(node => node.id);
    }

    async getPublicNode(nodeId: number): Promise<Node> {
        const book = await this.getPublishedBook();
        return await nodeRepo.findOne({where: {id: nodeId, bookId: book.id}});
    }

    async moveNode(nodeId: number, request: { newBookId?: number, newParentId: number, pos: number }): Promise<Node> {
        console.log(`Start move node ${nodeId}`);
        return await dataSource.transaction(async (entityManager) => {
            const nodeRepo = entityManager.getRepository(Node);
            const {newParentId, pos} = request;
            const node = await nodeRepo.findOneOrFail({where: {id: nodeId}});

            if (node.parentId === newParentId) {
                const parent = await nodeRepo.findOneOrFail({where: {id: node.parentId}});
                const childList = (parent.children || []);
                const index = childList.indexOf(node.id);
                childList.splice(index, 1);
                childList.splice(pos, 0, node.id);
                await nodeRepo.update(parent.id, {children: childList});
                console.log('Done change order in node. New child list', childList);
            } else {
                const oldParent = await nodeRepo.findOneOrFail({where: {id: node.parentId}});
                const newParent = await nodeRepo.findOneOrFail({where: {id: newParentId}});

                const validateNoLoop = async (nodeId: number, newParentId: number) => {
                    let iter: number = newParentId;
                    while (iter) {
                        if (iter === nodeId) {
                            throw new BadRequestError('Cannot move node. Creating a loop');
                        }
                        const node = await nodeRepo.findOneOrFail({where: {id: iter}});
                        console.log(`Check node ${iter} ${node.name}`);
                        iter = node.parentId;
                    }
                };

                // forbid that newParent is a children of current node.
                // when this happens, it creates an island loop which basically detach the whole subtree
                await validateNoLoop(nodeId, newParentId);

                console.log(`Check bookId ${node.bookId} ${newParent.bookId}`);
                if (node.bookId !== newParent.bookId) {
                    console.log(`Update bookId from ${node.bookId} to ${newParent.bookId}`);
                    await applyRecursively(nodeId, async (nodeId) => {
                        const load = await nodeRepo.findOneOrFail({where: {id: nodeId}});
                        const updated = await nodeRepo.save({...load, bookId: newParent.bookId});
                        console.log(`Update bookId for ${updated.id}`, updated);
                        return updated;
                    });
                    console.log('Done set bookId');
                }

                let childList = (newParent.children || []);
                if (!childList.includes(node.id)) {
                    if (childList.length >= pos) {
                        childList.splice(pos, 0, node.id);
                    } else {
                        childList = [...childList, node.id];
                    }
                }

                await Promise.all([
                    nodeRepo.update(oldParent.id, {children: oldParent.children.filter(childId => childId != node.id)}),
                    nodeRepo.update(newParent.id, {children: childList}),
                    nodeRepo.update(node.id, {parentId: newParentId})]);

                console.log('Done move node to new parent');
            }
            return node;
        });
    }

    async deleteNode(nodeId: number): Promise<number[]> {
        console.log(`Start delete node ${nodeId}`);
        return await dataSource.transaction(async (entityManager) => {
            const nodeRepo = entityManager.getRepository(Node);
            const node = await nodeRepo.findOneOrFail({where: {id: nodeId}});
            if (!node.parentId) {
                throw new BadRequestError('Cannot delete root node');
            }
            const parent = await nodeRepo.findOneOrFail({where: {id: node.parentId}});
            await nodeRepo.update(parent.id, {children: parent.children.filter(id => id !== nodeId)});

            const subTreeNodeIds = await findSubTreeNodeIds(nodeId, nodeRepo);
            console.log('Deleting nodes ', subTreeNodeIds);
            await nodeRepo.delete(subTreeNodeIds);
            return subTreeNodeIds;
        });
    }

    async getBooks() {
        return await bookRepo.find({order: {order: 'ASC'}});
    }

    async query(bookId: number) {

        return await nodeRepo.find({where: {app: 1, bookId}});
    }

    private async generateNodeId(): Promise<number> {
        const {nodeId} = await dataSource.createQueryBuilder().select('nextval(\'seq_node_id\')', 'nodeId').from('seq_node_id', 'seq').getRawOne();
        return parseInt(nodeId);
    }

    async createBook(request: CreateSpaceRequest) {
        const nodeId = await this.generateNodeId();
        const {bookId} = await dataSource.createQueryBuilder().select('max(id)+1', 'bookId').from('space', 'space').getRawOne();

        const node = await nodeRepo.save({
            id: nodeId,
            app: APP_PENCIL,
            userId: USER_ID,
            bookId,

            name: request.name,
            title: request.name,
        });

        const book = await bookRepo.save({
            id: bookId,
            code: request.code,
            rootId: node.id,
            name: request.name,
        });
        return {book, node};
    }

    async addNode(parentId: number, position: number = 0): Promise<Node> {
        console.log(`START.Add Node parentId=${parentId}, pos=${position}`);
        const parent = await nodeRepo.findOneOrFail({where: {id: parentId}});
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

        const node = await nodeRepo.save(createNode);

        const children = parent.children ?? [];
        if (children.length < position) {
            children.push(node.id);
        } else {
            children.splice(position, 0, node.id);
        }
        parent.children = children;
        await nodeRepo.save(parent);
        console.log(`Added node ${nodeId}`);
        return node;
    }

    async updateNode(node: Node): Promise<Node> {
        console.log(`Start upload node ${node.id}`);
        const existing = await nodeRepo.findOneOrFail({where: {id: node.id}});
        delete node.userId;
        delete node.app;
        delete node.createTime;
        delete node.updateTime;
        return await nodeRepo.save({...existing, ...node});
    }


}
