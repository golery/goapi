import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import * as uuid from 'uuid'; 

@Entity({ tableName: 'record' })
export class DataRecord {
    // Phone-supplied ids are not always UUIDs (built-in custom field ids
    // are plain strings like 'expiry-date'), so the column is text.
    @PrimaryKey({ type: 'text' })
    id: string = uuid.v4();

    @Property({ type: 'jsonb' })
    data = {};

    @Property()
    appId!: number;

    @Property()
    userId!: number;

    @Property()
    groupId?: number;

    @Property() 
    type!: string;

    @Property()
    createdAt = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt = new Date();
}
