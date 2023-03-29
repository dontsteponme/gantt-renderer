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
    id?: string; // maps to row model
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


export const renderView = (shape: Shape, ctx: CanvasRenderingContext2D) => {
    if (shape) {
        switch (shape.type) {
            case 'text':
                const text = shape as Text;
                ctx.font = text.font;
                ctx.fillStyle = text.color;
                ctx.textAlign = text.textAlign;
                ctx.textBaseline = text.textBaseline;
                ctx.fillText(text.text, text.x, text.y, text.width);
                break;
            case 'rect':
            default:
                ctx.beginPath();
                const rect = shape as ViewRect;
                if (rect.borderRadius) {
                    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, rect.borderRadius);
                } else {
                    ctx.rect(rect.x, rect.y, rect.width, rect.height);
                }
                if (rect.backgroundColor) {
                    ctx.fillStyle = rect.backgroundColor;
                    ctx.fill();
                }
                if (rect.borderColor && rect.borderWidth) {
                    ctx.strokeStyle = rect.borderColor;
                    ctx.lineWidth = rect.borderWidth;
                    ctx.stroke();
                }
                if (rect.children?.length) {
                    ctx.save();
                    const path: Path2D = new Path2D();
                    const paddingLeft: number = rect.paddingLeft ?? 0;
                    const paddingRight: number = rect.paddingRight ?? 0;
                    const paddingBottom: number = rect.paddingBottom ?? 0;
                    const paddingTop: number = rect.paddingTop ?? 0;
                    const x = rect.x + paddingLeft;
                    const y = rect.y + paddingTop;

                    path.rect(
                        x,
                        y,
                        rect.width - paddingLeft - paddingRight,
                        rect.height - paddingTop - paddingBottom
                    );

                    ctx.clip(path);
                    ctx.translate(x, y);
                    rect.children.forEach((c) => renderView(c, ctx));
                    ctx.restore();
                }
                break;
        }
    }
};

export const collides = (r0: Rect, r1: Rect): boolean => {
    return r0.x < r1.x + r1.width &&
        r0.x + r0.width > r1.x &&
        r0.y < r1.y + r1.height &&
        r0.y + r0.height > r1.y;
};
