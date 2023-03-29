export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
}
export interface ViewRect extends Rect, Shape {
    children?: ViewRect[];
}
export interface Shape {
    id?: string;
    type: ShapeType;
    x: number;
    y: number;
    borderColor?: string;
    borderWidth?: number;
    backgroundColor?: string;
    borderRadius?: number;
}
export interface Text extends ViewRect {
    text: string;
    font: string;
    color: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
}
export type ShapeType = 'rect' | 'text';
export declare const renderView: (shape: Shape, ctx: CanvasRenderingContext2D) => void;
export declare const collides: (r0: Rect, r1: Rect) => boolean;
