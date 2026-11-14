export type OnHandLine = {
    productId: string;
    storageId: string;
    quantity: number;
};

export type StockEvent =
    | {
        type: 'receive';
        productId: string;
        storageId: string;
        quantity: number;
    }
    | {
        type: 'sell';
        productId: string;
        storageId: string;
        quantity: number;
    }
    | {
        type: 'move';
        productId: string;
        fromStorageId: string;
        toStorageId: string;
        quantity: number;
    }
    | {
        type: 'count';
        storageId: string;
        lines: { productId: string; seen: number }[];
    };

export function positionKey(productId: string, storageId: string): string {
    return `${productId}\n${storageId}`;
}

export function roundQty(value: number): number {
    return Math.round(value * 1000) / 1000;
}

/** Applies one stock event onto the quantities the server already has. */
export function applyStockEvent(
    current: ReadonlyMap<string, number>,
    event: StockEvent,
): OnHandLine[] {
    const read = (productId: string, storageId: string): number =>
        current.get(positionKey(productId, storageId)) ?? 0;

    if (event.type === 'receive') {
        return [line(event.productId, event.storageId, read(event.productId, event.storageId) + event.quantity)];
    }
    if (event.type === 'sell') {
        return [line(event.productId, event.storageId, read(event.productId, event.storageId) - event.quantity)];
    }
    if (event.type === 'move') {
        return [
            line(event.productId, event.fromStorageId, read(event.productId, event.fromStorageId) - event.quantity),
            line(event.productId, event.toStorageId, read(event.productId, event.toStorageId) + event.quantity),
        ];
    }
    return event.lines.map((entry) => line(entry.productId, event.storageId, entry.seen));
}

function line(productId: string, storageId: string, quantity: number): OnHandLine {
    return { productId, storageId, quantity: roundQty(quantity) };
}
