export class ServerError extends Error {
    public data?: Record<string, unknown>;
    public code: number;

    constructor(code: number, message: string, data?: Record<string, unknown>) {
        super(message);
        this.name = 'ServerError';
        this.code = code;
        this.data = data;
    }

    
    public toString(): string {
        return `Error ${this.name} ${this.code}: ${this.message}`;
    }
}