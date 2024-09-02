import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';

const childrenTransformer = {
    from(db: string | null): null | number[] {
        if (!db) {
            return [];
        }
        return db
            .split(',')
            .map((v) => parseInt(v))
            .filter((v) => !isNaN(v));
    },
    to(entity: number[] | null): string | null {
        if (!entity) return null;
        return entity.join(',');
    },
};
@Entity()
export class Node {
    @PrimaryColumn()
    id!: number;
    @Column()
    @CreateDateColumn()
    createTime!: Date;
    @Column()
    @UpdateDateColumn()
    updateTime!: Date;
    @Column()
    app!: number;
    @Column()
    userId!: string;
    // always null
    @Column()
    type!: string | null;
    @Column({ name: 'space' })
    bookId!: number;
    @Column()
    parentId!: number | null;
    @Column('text', { transformer: childrenTransformer })
    children!: number[] | null;
    // What is title used for?
    @Column()
    title!: string | null;
    // Name is displayed on the tree
    @Column()
    name!: string | null;
    @Column()
    text: string | null;
}
