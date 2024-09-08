import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import * as uuid from 'uuid';

// Table name must be in plural because user is a keyword in postgres
@Entity({ tableName: 'users' })
export class User {
    @PrimaryKey({ autoincrement: true })
    id!: number;

    @Property()
    appId!: number;

    @Property()
    email!: string;

    @Property({ nullable: true })
    password?: string;

    @Property({ nullable: true })
    passwordHash?: string;

    @Property()
    createdAt = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt = new Date();
}
