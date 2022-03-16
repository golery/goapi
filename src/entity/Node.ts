import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

// TODO rename table to book
@Entity()
export class Node {
    @PrimaryGeneratedColumn()
    id?: number;
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
    space?: number;
    @Column()
    text: string;
    @Column({name: 'space'})
    bookId: number;
}