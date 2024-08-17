import {Column, Entity, PrimaryColumn} from 'typeorm';

@Entity('record')
export class Record {
    @PrimaryColumn()
    id: number;
    @Column()
    userId: number;
    @Column()
    appId: number;
    @Column()
    groupId?: number;
    @Column()
    type: string;
    @Column()
    data: any;
}