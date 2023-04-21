import { EventEmitter } from "./eventEmitter";

/**
 * InteractionManager handles gesture detection
 */
export class InteractionManager extends EventEmitter {

    private _isDown: boolean = false;
    private _isDragging: boolean = false;
    private _prevEvent: PointerEvent | null | undefined;

    /**
     * As it says on the tin
     * Add event listeners
     */
    public addEventListeners(): void {
        window.addEventListener('pointermove', this._handleMove);
        window.addEventListener('pointerdown', this._handleDown);
        window.addEventListener('click', this._handleClick);
        window.addEventListener('wheel', this._handleWheel, { passive: false });
    }

    /**
     * Remove event listeners
     */
    public removeEventListeners(): void {
        window.removeEventListener('pointermove', this._handleMove);
        window.removeEventListener('pointerdown', this._handleDown);
        window.removeEventListener('click', this._handleClick);
        window.removeEventListener('wheel', this._handleWheel);
    }

    /**
     * Destroy event
     */
    public destroy(): void {
        this.removeEventListeners();
        this.off();
    }

    /**
     * Listen to scroll events and pinch-to-zoom gesture
     * @param event
     */
    private _handleWheel = (event: WheelEvent) => {
        if ('CANVAS' === (event.target as HTMLElement).tagName) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        if (event.ctrlKey) {
            // zoom
            this.trigger('zoom', event.deltaY);
        } else {
            const horizontalScroll = Math.abs(event.deltaX) > Math.abs(event.deltaY);
            if (horizontalScroll) {
                this.trigger('scroll', event.deltaX, 0);
            } else {
                this.trigger('scroll', 0, event.deltaY);
            }
        }
    };

    /**
     * Handles a good ol' fashioned click event
     * @param event
     * @returns
     */
    private _handleClick = (event: MouseEvent) => {
        if ((event.target as HTMLElement).tagName === 'CANVAS') {
            if (this._isDragging) {
                return;
            }
            const { x, y } = this._pointFromEvent(event);
            this.trigger('click', x, y);
        }
    };

    /**
     * handle down event
     * @param event
     */
    private _handleDown = (event: PointerEvent) => {
        if ((event.target as HTMLElement).tagName === 'CANVAS') {
            this._isDown = true;
            this._prevEvent = event;
            window.addEventListener('pointerup', this._handleUp);
        }
    };

    /**
     * handle up events
     * @param event
     */
    private _handleUp = (event: PointerEvent) =>  {
        if (this._isDragging) {
            this.trigger('dragend', event.pageX, event.pageY);

            // ignore click when dragging
            window.removeEventListener('click', this._handleClick);

            window.requestAnimationFrame(() => {
                window.addEventListener('click', this._handleClick);
            });
        }

        window.removeEventListener('pointerup', this._handleUp);
        this._prevEvent = null;
        this._isDown = false;
        this._isDragging = false;
    };

    /**
     * Handles mouse moves
     * @param event
     */
    private _handleMove = (event: PointerEvent) => {
        if (this._isDown) {
            const { x, y } = this._pointFromEvent(event);
            this.trigger('drag', x, y, event.pageX - this._prevEvent.pageX, event.pageY - this._prevEvent.pageY);
            this._prevEvent = event;
            this._isDragging = true;
        }
    };

    /**
     * xy values from a given event
     * @param event
     * @returns
     */
    private _pointFromEvent = (event: PointerEvent | MouseEvent): { x: number, y: number } => {
        const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
        return {
            x: event.pageX - rect.left,
            y: event.pageY - rect.top
        };
    };

}
