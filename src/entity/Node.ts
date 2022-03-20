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
    app: number;
    @Column()
    userId: string;
    @Column()
    type: string;
    @Column()
    parentId: string;
    @Column('text', {transformer: childrenTransformer})
    children: string;
    @Column()
    createTime: Date;
    @Column()
    updateTime: Date;
    @Column()
    text: string;
    @Column({name: 'space'})
    bookId: number;
}