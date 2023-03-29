export declare class EventEmitter {
    private _subscriptions;
    on(event: string, callback: Function): void;
    off(event?: string, callback?: Function): void;
    trigger(event: string, ...data: unknown[]): void;
    destroy(): void;
}
