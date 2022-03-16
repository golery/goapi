import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

// TODO rename table to book
@Entity('space')
export class Book {
    @PrimaryGeneratedColumn()
    id?: number;
    @Column()
    code: string;
    @Column()
    rootId: number;
    @Column()
    name: string;
}