import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import * as uuid from 'uuid'; 

@Entity({ tableName: 'file' })
export class File {
    @PrimaryKey({ type: 'uuid' })
    id = uuid.v4();

    @Property()
    appId!: number;

    @Property()
    userId!: number;

    @Property() 
    key!: string;

    @Property() 
    size!: number;

    @Property()
    createdAt = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt = new Date();
}
