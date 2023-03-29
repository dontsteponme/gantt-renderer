import { Axis } from "./axis";
import { Definition, GanttModel } from "./models";
import { ViewRect, Shape, Rect } from "./renderHelper";
export declare const viewModelFromModel: (model: GanttModel, definition: Definition, axis: Axis, viewport: Rect, ctx: CanvasRenderingContext2D) => ViewRect;
declare class ElementWithParent {
    element: Shape;
    parent: ElementWithParent | null;
    constructor(element: Shape, parent: ElementWithParent | null);
}
export declare const elementInView: (rect: Rect, element: ViewRect, parent?: ElementWithParent) => ElementWithParent | null;
export {};
