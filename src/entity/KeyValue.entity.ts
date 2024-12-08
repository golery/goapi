import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import * as uuid from 'uuid'; 

@Entity({ tableName: 'key_value' })
export class KeyValue {
    @PrimaryKey()    
    appId!: number;

    @PrimaryKey()
    userId!: number;

    @PrimaryKey()
    key!: string;

    @Property() 
    text?: string;

    @Property()
    createdAt = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt = new Date();
}
