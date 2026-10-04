import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

export type MembershipRole = 'owner' | 'staff';

@Entity({ tableName: 'user_group' })
export class UserGroup {
    @PrimaryKey()
    userId!: number;

    @PrimaryKey()
    groupId!: number;

    @Property({ default: 'owner' })
    role: MembershipRole = 'owner';
}
