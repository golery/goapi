import { Bookmark } from '../entity/Bookmark';
import { BookmarkCollection } from '../entity/BookmarkCollection';
import { BookmarkTag } from '../entity/BookmarkTag';
import { bookmarkCollectionRepo, bookmarkRepo, bookmarkTagRepo, dataSource } from './db';
import { In } from 'typeorm';

export interface CreateBookmarkRequest {
    collectionId?: string;
    url: string;
    name?: string;
    description?: string;
    note?: string;
    tags?: string[];
    previewImages?: string[];
}

export interface UpdateBookmarkRequest {
    url?: string;
    name?: string | null;
    description?: string;
    note?: string;
    tags?: string[];
    collectionId?: string | null;
    previewImages?: string[];
}

export class BookmarkService {
    async createCollection(name: string, userId: string): Promise<BookmarkCollection> {
        const collection = new BookmarkCollection();
        collection.name = name;
        collection.userId = userId;
        return await bookmarkCollectionRepo.save(collection);
    }

    async listCollections(userId: string): Promise<BookmarkCollection[]> {
        return await bookmarkCollectionRepo.find({
            where: { userId },
            order: { name: 'ASC' },
        });
    }

    async updateCollection(id: string, name: string, userId: string): Promise<BookmarkCollection | null> {
        const collection = await bookmarkCollectionRepo.findOne({ where: { id, userId } });
        if (!collection) return null;
        collection.name = name;
        return await bookmarkCollectionRepo.save(collection);
    }

    async deleteCollection(id: string, userId: string): Promise<boolean> {
        const result = await bookmarkCollectionRepo.delete({ id, userId });
        return (result.affected ?? 0) > 0;
    }

    async addBookmark(userId: string, request: CreateBookmarkRequest): Promise<Bookmark> {
        if (request.collectionId) {
            const collection = await bookmarkCollectionRepo.findOne({
                where: { id: request.collectionId, userId },
            });
            if (!collection) {
                throw new Error('Collection not found or access denied');
            }
        }

        return await dataSource.transaction(async (manager) => {
            const bookmark = new Bookmark();
            bookmark.collectionId = request.collectionId ?? null;
            bookmark.url = request.url;
            bookmark.name = request.name ?? null;
            bookmark.description = request.description ?? null;
            bookmark.note = request.note ?? null;
            bookmark.data = { previewImages: request.previewImages || [] };
            bookmark.userId = userId;

            const savedBookmark = await manager.save(bookmark);

            if (request.tags && request.tags.length > 0) {
                const tags = request.tags.map((tag) => {
                    const bt = new BookmarkTag();
                    bt.bookmarkId = savedBookmark.id;
                    bt.tag = tag;
                    return bt;
                });
                await manager.save(tags);
                savedBookmark.tags = request.tags;
            } else {
                savedBookmark.tags = [];
            }

            return savedBookmark;
        });
    }

    async updateBookmark(id: string, userId: string, request: UpdateBookmarkRequest): Promise<Bookmark | null> {
        const bookmark = await bookmarkRepo.findOne({ where: { id, userId } });
        if (!bookmark) return null;

        return await dataSource.transaction(async (manager) => {
            if (request.url !== undefined) bookmark.url = request.url;
            if (request.name !== undefined) bookmark.name = request.name;
            if (request.description !== undefined) bookmark.description = request.description;
            if (request.note !== undefined) bookmark.note = request.note;
            if (request.previewImages !== undefined) {
                bookmark.data = { ...bookmark.data, previewImages: request.previewImages };
            }
            if (request.collectionId !== undefined) {
                if (request.collectionId !== null) {
                    // Validate new collection
                    const collection = await bookmarkCollectionRepo.findOne({
                        where: { id: request.collectionId, userId },
                    });
                    if (!collection) throw new Error('Target collection not found');
                }
                bookmark.collectionId = request.collectionId ?? null;
            }

            const updatedBookmark = await manager.save(bookmark);

            if (request.tags !== undefined) {
                // Delete existing tags
                await manager.delete(BookmarkTag, { bookmarkId: id });
                // Add new tags
                if (request.tags.length > 0) {
                    const tags = request.tags.map((tag) => {
                        const bt = new BookmarkTag();
                        bt.bookmarkId = id;
                        bt.tag = tag;
                        return bt;
                    });
                    await manager.save(tags);
                }
                updatedBookmark.tags = request.tags;
            } else {
                // Load existing tags
                const tags = await manager.find(BookmarkTag, { where: { bookmarkId: id } });
                updatedBookmark.tags = tags.map(t => t.tag);
            }

            return updatedBookmark;
        }) ?? null;
    }

    async deleteBookmark(id: string, userId: string): Promise<boolean> {
        const result = await bookmarkRepo.delete({ id, userId });
        return (result.affected ?? 0) > 0;
    }

    async getAllBookmarks(userId: string): Promise<Bookmark[]> {
        const bookmarks = await bookmarkRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });

        if (bookmarks.length === 0) return [];

        const bookmarkIds = bookmarks.map((b) => b.id);
        const tags = await bookmarkTagRepo.find({
            where: { bookmarkId: In(bookmarkIds) },
        });

        // Map tags to bookmarks
        const tagsMap = tags.reduce((acc, tag) => {
            if (!acc[tag.bookmarkId]) acc[tag.bookmarkId] = [];
            acc[tag.bookmarkId].push(tag.tag);
            return acc;
        }, {} as Record<string, string[]>);

        bookmarks.forEach((b) => {
            b.tags = tagsMap[b.id] || [];
        });

        return bookmarks;
    }
}
