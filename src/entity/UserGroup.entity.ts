import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import * as uuid from 'uuid';

// Table name must be in plural because user is a keyword in postgres
@Entity({ tableName: 'user_group' })
export class UserGroup {
    @PrimaryKey()
    userId!: number;

    @PrimaryKey()
    groupId!: number;
}
