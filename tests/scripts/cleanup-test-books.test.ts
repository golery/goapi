import { expect } from 'chai';
import { bookRepo, closeDb, initDb, nodeRepo } from '../../src/services/db';
import { Like } from 'typeorm';

describe('Cleanup Test Books', () => {
    before(async () => {
        await initDb();
    });

    after(async () => {
        await closeDb();
    });

    it('should delete all books and nodes with name starting with "Test Book"', async () => {
        const testBooks = await bookRepo.find({
            where: {
                name: Like('Test Book%')
            }
        });

        console.log(`Found ${testBooks.length} test books to delete.`);

        for (const book of testBooks) {
            // Delete nodes associated with this book
            const nodesResult = await nodeRepo.delete({ bookId: book.id });
            console.log(`Deleted ${nodesResult.affected} nodes for book "${book.name}" (ID: ${book.id})`);

            // Delete the book itself
            const bookResult = await bookRepo.delete({ id: book.id });
            console.log(`Deleted book "${book.name}" (ID: ${book.id})`);
        }

        const remainingBooks = await bookRepo.count({
            where: {
                name: Like('Test Book%')
            }
        });

        expect(remainingBooks).to.equal(0);
    });
});
