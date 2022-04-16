import {Node} from '../entity/Node';
import {BadRequestError} from '../util/exceptions';
import {dataSource, bookRepo, nodeRepo} from './Init';

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


export class PencilService {
    async moveNode(nodeId: number, request: { newBookId?: number, newParentId: number, pos: number }): Promise<Node> {
        console.log(`Start move node ${nodeId}`);
        return await dataSource.transaction(async (entityManager) => {
            const nodeRepo = entityManager.getRepository(Node);
            const {newParentId, pos} = request;
            const node = await nodeRepo.findOneOrFail({where: {id: nodeId}});
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

            if (node.bookId !== newParent.bookId) {
                console.log(`Update bookId from ${node.bookId} to ${newParent.bookId}`);
                await applyRecursively(nodeId, async (nodeId) => {
                    const load = await nodeRepo.findOneOrFail({where: {id: nodeId}});
                    const updated = await nodeRepo.save({...load, bookId: newParent.bookId});
                    console.log(`Update bookId for ${updated.id}`, updated);
                    return updated;
                });
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

            return node;
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
        const existing = await nodeRepo.findOneOrFail({where: {id: node.id}});
        delete node.userId;
        delete node.app;
        delete node.createTime;
        delete node.updateTime;
        console.log(`Update ${node.id}`);
        return await nodeRepo.save({...existing, ...node});
    }
}
