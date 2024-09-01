import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import * as uuid from 'uuid';

@Entity({ tableName: 'user' })
export class User {
    @PrimaryKey({ type: 'uuid' })
    id = uuid.v4();

    @Property()
    email: string;

    @Property()
    password: string;

    @Property()
    passwordHash: string;

    @Property()
    createdAt = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt = new Date();
}
