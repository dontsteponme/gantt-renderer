import { Rect, Text, ViewRect } from "./models";

/**
 * Walk through view rect tree and draw items
 * @param ViewRect
 * @param ctx
 */
export const renderView = (ViewRect: ViewRect, ctx: CanvasRenderingContext2D) => {
    if (ViewRect) {
        const paddingLeft: number = ViewRect.paddingLeft ?? 0;
        const paddingRight: number = ViewRect.paddingRight ?? 0;
        const paddingBottom: number = ViewRect.paddingBottom ?? 0;
        const paddingTop: number = ViewRect.paddingTop ?? 0;
        switch (ViewRect.type) {
            case 'text':
                const text = ViewRect as Text;
                ctx.font = text.font;
                ctx.textAlign = text.textAlign;
                ctx.textBaseline = text.textBaseline;
                let x = text.x;
                let y = text.y;

                if (text.backgroundColor) {
                    const metrics = ctx.measureText(text.text);
                    const textHeight = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
                    const background = { ...text, type: 'rect' } as ViewRect;
                    background.width = metrics.width + paddingLeft + paddingRight;
                    background.height = textHeight + paddingBottom + paddingTop;
                    switch (text.textAlign) {
                        case 'center':
                            background.x = background.x - metrics.width / 2 - paddingLeft;
                            break;
                        case 'right':
                            background.x = background.x - metrics.width - paddingLeft;
                            break;
                        case 'left':
                            x += paddingLeft;
                            break;
                        default:
                            break;
                    }

                    switch (text.textBaseline ){
                        case 'middle':
                            background.y = background.y - textHeight / 2 - paddingTop;
                            break;
                        case 'bottom':
                            background.y = background.y - textHeight - paddingTop;
                            break;
                        case 'top':
                            y += paddingTop;
                            break;
                        default:
                            break;
                    }
                    renderView(background, ctx);
                }

                ctx.fillStyle = text.color;
                ctx.fillText(text.text, x, y);
                break;
            case 'rect':
            default:
                ctx.beginPath();
                const rect = ViewRect as ViewRect;
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

/**
 * rectangles collide
 * @param r0
 * @param r1
 * @returns
 */
export const collides = (r0: Rect, r1: Rect): boolean => {
    return r0.x < r1.x + r1.width &&
        r0.x + r0.width > r1.x &&
        r0.y < r1.y + r1.height &&
        r0.y + r0.height > r1.y;
};
