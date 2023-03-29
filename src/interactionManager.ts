import { EventEmitter } from "./eventEmitter";

export class InteractionManager extends EventEmitter {

    private _isDown: boolean = false;
    private _isDragging: boolean = false;
    private _prevEvent: PointerEvent | null | undefined;

    public enableScroll(): void {
        window.addEventListener('wheel', this._handleWheel, { passive: false });
    }

    public disableScroll(): void {
        window.removeEventListener('wheel', this._handleWheel);
    }

    public addEventListeners(): void {
        window.addEventListener('pointermove', this._handleMove);
        window.addEventListener('pointerdown', this._handleDown);
        window.addEventListener('click', this._handleClick);
        this.enableScroll();
    }

    public removeEventListeners(): void {
        window.removeEventListener('pointermove', this._handleMove);
        window.removeEventListener('pointerdown', this._handleDown);
        window.removeEventListener('click', this._handleClick);
        this.disableScroll();
    }

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

    private _handleClick = (event: PointerEvent) => {
        if ((event.target as HTMLElement).tagName === 'CANVAS') {
            if (this._isDragging) {
                return;
            }
            this.trigger('click', event.pageX, event.pageY);
        }
    };

    private _handleDown = (event: PointerEvent) => {
        if ((event.target as HTMLElement).tagName === 'CANVAS') {
            this._isDown = true;
            this._prevEvent = event;
            window.addEventListener('pointerup', this._handleUp);
        }
    };

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

    private _handleMove = (event: PointerEvent) => {
        if (this._isDown) {
            this.trigger('drag', event.pageX, event.pageY, event.pageX - this._prevEvent.pageX, event.pageY - this._prevEvent.pageY);
            this._prevEvent = event;
            this._isDragging = true;
        }
    };

}
