import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import * as uuid from 'uuid';

// Table name must be in plural because user is a keyword in postgres
@Entity({ tableName: 'user_group' })
export class UserGroup {
    @PrimaryKey()
    user_id!: number;

    @PrimaryKey()
    group_id!: number;
}
