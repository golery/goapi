import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('bookmark')
export class Bookmark {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'collection_id' })
    collectionId!: string;

    @Column()
    url!: string;

    @Column()
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'text', nullable: true })
    note!: string | null;

    @Column({ name: 'user_id' })
    userId!: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt!: Date;

    // We can add tags as a virtual property or manage them via the service
    tags?: string[];
}
