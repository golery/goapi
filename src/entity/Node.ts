import {Column, Entity, PrimaryColumn} from 'typeorm';

const childrenTransformer = {
    from(db: string | null): null | number[] {
        if (!db) {
            return null;
        }
        return db.split(',').map(v => parseInt(v));
    },
    to(entity:number[] | null): string | null {
        if (!entity) return null;
        return entity.join(',');
    }
};
@Entity()
export class Node {
    @PrimaryColumn()
    id: number;
    @Column()
    createTime: Date;
    @Column()
    updateTime: Date;
    @Column()
    app: number;
    @Column()
    userId: string;
    @Column()
    type: string;
    @Column({name: 'space'})
    bookId: number;
    @Column()
    parentId: string | null;
    @Column('text', {transformer: childrenTransformer})
    children: string | null;
    // What is title used for?
    @Column()
    title: string  | null;
    // Name is displayed on the tree
    @Column()
    name: string  | null;
    @Column()
    text: string  | null;
}