import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

// Table name must be in plural because user is a keyword in postgres
@Entity({ tableName: 'group' })
export class Group {
    @PrimaryKey({ autoincrement: true })
    id!: number;

    @Property()
    appId!: number;

    @Property({ nullable: true })
    name?: string;

    @Property()
    createdAt = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt = new Date();
}
