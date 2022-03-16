import {Column, Entity, PrimaryColumn} from 'typeorm';

// TODO rename table to book
@Entity('space')
export class Book {
    @PrimaryColumn()
    id?: number;
    @Column()
    code: string;
    @Column()
    rootId: number;
    @Column()
    name: string;
}