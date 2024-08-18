import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import * as uuid from 'uuid';

@Entity({tableName: 'object'})
export class DataRecord {

   @PrimaryKey({ type: 'uuid' })
   id = uuid.v4();

   @Property({ type: 'jsonb' })
   data = {};


   @Property()
   appId: number;

   @Property()
   userId: number;

   @Property()
   groupId?: number;

   @Property()
   type: string;

   @Property()
   createdAt = new Date();

   @Property({ onUpdate: () => new Date() })
   updatedAt = new Date();
}