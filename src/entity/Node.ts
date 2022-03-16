import {Column, Entity, PrimaryColumn} from 'typeorm';

// TODO rename table to book
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
    createTime: Date;
    @Column()
    updateTime: Date;
    @Column()
    text: string;
    @Column({name: 'space'})
    bookId: number;
}