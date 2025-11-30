import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'node_tag' })
export class NodeTag {
    @PrimaryKey()
    nodeId!: number;

    @PrimaryKey()
    tag!: string;
}
