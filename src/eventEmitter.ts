/**
 * EventEmitter provides subscribing/triggering events on a subclass
 */
export class EventEmitter {
    /**
     * subscriptions associated with a given event type
     */
    private _subscriptions: Map<string, Function[]> = new Map();

    /**
     * Listens to an event
     * @param event
     * @param callback
     */
    public on(event: string, callback: Function): void {
        if (this._subscriptions.has(event)) {
            const callbacks = this._subscriptions.get(event);
            callbacks?.push(callback);
        } else {
            this._subscriptions.set(event, [callback]);
        }
    }

    /**
     * Remvoves event listener(s)
     * @param event
     * @param callback
     */
    public off(event?: string, callback?: Function): void {
        if (event) {
            if (this._subscriptions.has(event)) {
                if (callback) {
                    const callbacks = this._subscriptions.get(event) ?? [];
                    const len = callbacks?.length ?? 0;
                    for (let i = 0; i < len; i++) {
                        const _callback = callbacks?.[i];
                        if (_callback === callback) {
                            callbacks.splice(i, 1);
                            break;
                        }
                    }
                } else {
                    this._subscriptions.delete(event);
                }
            }
        } else {
            this._subscriptions.clear();
        }
    }

    /**
     * Dispatch an event to a listener
     * @param event
     * @param data
     */
    public trigger(event: string, ...data: unknown[]): void {
        if (this._subscriptions.has(event)) {
            const callbacks = this._subscriptions.get(event);
            const len = callbacks?.length ?? 0;
            for (let i = 0; i < len; i++) {
                callbacks?.[i](...data);
            }
        }
    }

    /**
     * Clean up
     */
    public destroy(): void {
        this.off();
    }
}
