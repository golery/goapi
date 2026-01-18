import { Entity, PrimaryColumn } from 'typeorm';

@Entity('bookmark_tag')
export class BookmarkTag {
    @PrimaryColumn({ name: 'bookmark_id', type: 'uuid' })
    bookmarkId!: string;

    @PrimaryColumn()
    tag!: string;
}
