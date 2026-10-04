import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'legal_acceptance' })
export class LegalAcceptance {
    @PrimaryKey({ autoincrement: true })
    id!: number;

    @Property()
    userId!: number;

    @Property()
    appId!: number;

    @Property()
    terms!: string;

    @Property()
    privacy!: string;

    @Property()
    ipAddress!: string;

    @Property()
    acceptedAt = new Date();
}
