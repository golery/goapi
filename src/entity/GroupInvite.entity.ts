import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'group_invite' })
export class GroupInvite {
    @PrimaryKey({ autoincrement: true })
    id!: number;

    @Property({ unique: true })
    code!: string;

    @Property()
    groupId!: number;

    @Property()
    expiresAt!: Date;

    @Property({ nullable: true })
    usedAt?: Date;

    @Property({ nullable: true })
    usedByUserId?: number;

    @Property({ nullable: true })
    revokedAt?: Date;
}
