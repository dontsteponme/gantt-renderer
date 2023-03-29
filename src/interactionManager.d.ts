import { EventEmitter } from "./eventEmitter";
export declare class InteractionManager extends EventEmitter {
    private _isDown;
    private _isDragging;
    private _prevEvent;
    enableScroll(): void;
    disableScroll(): void;
    addEventListeners(): void;
    removeEventListeners(): void;
    private _handleWheel;
    private _handleClick;
    private _handleDown;
    private _handleUp;
    private _handleMove;
}
