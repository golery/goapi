import { assert } from 'chai';
import { describe, it } from 'bun:test';
import { StockPushSchema } from '../../src/types/schemas';
import { applyStockEvent, positionKey } from '../../src/services/stockApply';

describe('stock apply', () => {
    it('adds a receive to the quantity already stored', () => {
        const current = new Map([[positionKey('ball', 'main'), 2]]);
        const lines = applyStockEvent(current, {
            type: 'receive',
            productId: 'ball',
            storageId: 'main',
            quantity: 5,
        });
        assert.deepEqual(lines, [{ productId: 'ball', storageId: 'main', quantity: 7 }]);
    });

    it('keeps both receives when each event is applied', () => {
        const current = new Map([[positionKey('ball', 'main'), 2]]);
        const afterFour = applyStockEvent(current, {
            type: 'receive',
            productId: 'ball',
            storageId: 'main',
            quantity: 4,
        });
        const next = new Map(current);
        next.set(positionKey('ball', 'main'), afterFour[0].quantity);
        const afterFive = applyStockEvent(next, {
            type: 'receive',
            productId: 'ball',
            storageId: 'main',
            quantity: 5,
        });
        assert.equal(afterFive[0].quantity, 11);
    });

    it('lets a sell drop on hand below zero', () => {
        const lines = applyStockEvent(new Map([[positionKey('ball', 'main'), 2]]), {
            type: 'sell',
            productId: 'ball',
            storageId: 'main',
            quantity: 5,
        });
        assert.equal(lines[0].quantity, -3);
    });

    it('moves units from one place to another', () => {
        const current = new Map([
            [positionKey('ball', 'main'), 6],
            [positionKey('ball', 'van'), 1],
        ]);
        const lines = applyStockEvent(current, {
            type: 'move',
            productId: 'ball',
            fromStorageId: 'main',
            toStorageId: 'van',
            quantity: 4,
        });
        assert.deepEqual(lines, [
            { productId: 'ball', storageId: 'main', quantity: 2 },
            { productId: 'ball', storageId: 'van', quantity: 5 },
        ]);
    });

    it('sets on hand to the counted number', () => {
        const lines = applyStockEvent(new Map([[positionKey('ball', 'main'), 7]]), {
            type: 'count',
            storageId: 'main',
            lines: [{ productId: 'ball', seen: 11 }],
        });
        assert.equal(lines[0].quantity, 11);
    });
});

describe('stock push schema', () => {
    const base = {
        deviceId: '00000000-0000-4000-8000-000000000001',
        deviceSeq: 1,
        baseSeq: 0,
        deviceNow: 1,
    };

    it('accepts a sell', () => {
        const parsed = StockPushSchema.parse({
            ...base,
            op: {
                opId: '00000000-0000-4000-8000-000000000002',
                v: 1,
                type: 'sell',
                at: 1,
                productId: 'ball',
                storageId: 'main',
                quantity: 2,
            },
        });
        assert.equal(parsed.op.type, 'sell');
    });

    it('rejects a move that stays in the same place', () => {
        const parsed = StockPushSchema.safeParse({
            ...base,
            op: {
                opId: '00000000-0000-4000-8000-000000000003',
                v: 1,
                type: 'move',
                at: 1,
                productId: 'ball',
                fromStorageId: 'main',
                toStorageId: 'main',
                quantity: 1,
            },
        });
        assert.equal(parsed.success, false);
    });
});
