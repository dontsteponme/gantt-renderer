import { Axis } from "./axis";
import { rowCount } from "./modelOperations";
import { Definition, GanttModel, Milestone, RowModel } from "./models";
import { ViewRect, Text, Rect, collides } from "./renderHelper";
import { Ticks } from "./ticks";

export const viewModelFromModel = (
    model: GanttModel,
    definition: Definition,
    axis: Axis,
    viewport: Rect,
    ctx: CanvasRenderingContext2D
): ViewRect => {

    const axisAreaTop = axisAreaModel(model, definition, viewport, ctx);
    const left = leftColumnViewModel(model, definition, viewport, ctx);
    const rows = rowLinesViewModel(model, definition, viewport, ctx);

    const axisViewport = { ...viewport, x: left.width, width: viewport.width - left.width };
    const labelArea = Math.ceil(labelHeight(model.rows, definition, ctx)) + 4;
    const axisView = axisViewModel(model, definition, axis, axisViewport, ctx);
    const itemView = itemViewModel(model, definition, axis, viewport, left.width, ctx, labelArea);
    const links = linksFromRow(model.rows, definition, itemView, ctx, 0, labelArea);
    const references = milestones(model.milestones ?? [], definition, axis, { ...axisViewport, y: axisAreaTop.height - 10 });

    return {
        ...viewport,
        type: 'rect',
        backgroundColor: definition.colors?.canvas ?? 'rgb(240, 240, 240)',
        children: [
            axisAreaTop,
            axisView,
            {
                type: 'rect',
                x: 0,
                y: axisAreaTop.height,
                height: viewport.height - axisAreaTop.height,
                width: viewport.width,
                children: [
                    left,
                    rows,
                    itemView,
                    ...links,
                ]
            },
            references,
        ]
    };
};

const milestones = (milestones: Milestone[], definition: Definition, axis: Axis, viewport: Rect): ViewRect => {
    const viewRects: ViewRect[] = [];
    const len = milestones.length;
    for (let i = 0; i < len; i++) {
        const milestone = milestones[i];
        const x = axis.toPoint(milestone.date);
        viewRects.push({
            type: 'rect',
            x: x,
            y: 0,
            width: 1,
            height: viewport.height,
            backgroundColor: milestone.color
        });
        if (milestone.name) {
            const font = definition.fonts?.item ?? '10pt -apple-system, Helvetica, Calibri';
            viewRects.push({
                type: 'text',
                x: x,
                y: 0,
                width: 0,
                height: 0,
                font: font,
                textAlign: 'center',
                textBaseline: 'top',
                text: milestone.name,
                color: '#fff',
                backgroundColor: milestone.color,
                paddingBottom: 4,
                paddingLeft: 4,
                paddingRight: 4,
                paddingTop: 4,
                borderRadius: 4,
            } as Text);
        }
    }

    return {
        type: 'rect',
        ...viewport,
        children: viewRects,
    };
};

const labelHeight = (rows: RowModel[], definition: Definition, ctx: CanvasRenderingContext2D): number => {
    const len: number = rows.length;
    for (let i = 0; i < len; i++) {
        const row = rows[i];
        if (row.item?.label) {
            ctx.save();
            const font = definition.fonts?.item ?? '10pt -apple-system, Helvetica, Calibri';
            ctx.font = font;
            const metrics = ctx.measureText(row.item.label);
            ctx.restore();
            return metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        }
        if (row.children?.length) {
            const childHeight = labelHeight(row.children, definition, ctx);
            if (childHeight) {
                return childHeight;
            }
        }
    }

    return 0;
};

const linksFromRow = (
    rows: RowModel[],
    definition: Definition,
    itemView: ViewRect,
    ctx: CanvasRenderingContext2D,
    index: number = 0,
    labelHeight: number = 0,
): ViewRect[] => {
    let rects: ViewRect[] = [];
    const len = rows.length;
    for (let i = 0; i < len; i++) {
        const row = rows[i];

        if (row.item?.after) {
            const afterRow = getById(row.item.after, itemView);
            const afterItem = getByClassName('item', afterRow.element);
            const linkedRow = getById(row.id, itemView);
            const linkedItem = getByClassName('item', linkedRow.element);

            if (afterItem.element && linkedItem.element) {
                let parent = afterItem.parent;
                let x = afterItem.element.x + afterItem.element.width;
                while (parent?.element) {
                    x += (parent.element.paddingLeft ?? 0) + parent.element.x;
                    parent = parent.parent;
                }

                const afterAbove = afterRow.element.y < linkedRow.element.y;
                const d = 4;
                const r = d / 2;
                rects.push({
                    type: 'rect',
                    x: x - 1,
                    y: (afterAbove ? afterRow.element.y : linkedRow.element.y) + (definition.rowHeight + labelHeight) / 2,
                    width: 2,
                    height: Math.abs(afterRow.element.y - linkedRow.element.y),
                    backgroundColor: definition.colors?.links ?? 'rbga(255, 255, 255, 0.4)',
                });
                rects.push({
                    type: 'rect',
                    x: x - r,
                    y: (afterAbove ? afterRow.element.y - r : linkedRow.element.y + r) + (definition.rowHeight + labelHeight) / 2,
                    width: d,
                    height: d,
                    backgroundColor: definition.colors?.links ?? '#ffffff',
                    borderRadius: r,
                });
            }
        }

        index += 1;
        if (row.children?.length > 0) {
            rects = rects.concat(linksFromRow(row.children, definition, itemView, ctx, index));
        }
    }
    return rects;
};

const getByClassName = (name: string, shape: ViewRect, parent: IElementWithParent | null = null): IElementWithParent | null => {
    if (!shape) {
        return null;
    }
    if (name === shape.className) {
        return new ElementWithParent(shape, parent);
    }
    const rect = shape as ViewRect;
    if (rect.children?.length > 0) {
        const len = rect.children.length;
        for (let i = 0; i < len; i++) {
            const test = getByClassName(name, rect.children[i], new ElementWithParent(rect, parent));
            if (test) {
                return test;
            }
        }
    }
    return null;
};

const getById = (id: string, rect: ViewRect, parent: IElementWithParent | null = null): IElementWithParent | null => {
    if (id === rect.id) {
        return new ElementWithParent(rect, parent);
    }
    if (rect.children) {
        const len = rect.children.length;
        for (let i = 0; i < len; i++) {
            const test = getById(id, rect.children[i], new ElementWithParent(rect, parent));
            if (test) {
                return test;
            }
        }
    }
    return null;
};

const itemViewModel = (
    model: GanttModel,
    definition: Definition,
    axis: Axis,
    viewport: Rect,
    columnWidth: number,
    ctx: CanvasRenderingContext2D,
    labelHeight: number = 0
): ViewRect => {
    return {
        ...viewport,
        type: 'rect',
        className: 'canvas',
        interactive: true,
        children: itemsFromRows(model.rows, axis, definition, { ...viewport, paddingLeft: columnWidth }, ctx, labelHeight)
    };
};

const itemsFromRows = (
    rows: RowModel[],
    axis: Axis,
    definition: Definition,
    viewport: Rect,
    ctx: CanvasRenderingContext2D,
    labelHeight: number = 0,
    y: number = 0,
): ViewRect[] => {
    let rects: ViewRect[] = [];
    const len: number = rows.length;
    const fontColor = definition.colors?.itemLabels ?? '#333333';
    const font = definition.fonts?.item ?? '10pt -apple-system, Helvetica, Calibri';
    const padding = 8;
    const itemHeight = definition.rowHeight - labelHeight - padding * 2

    for (let i = 0; i < len; i++) {
        const row = rows[i];
        if (row.item) {
            const start = axis.toPoint(row.item.start);
            const end = axis.toPoint(row.item.end);
            const children: ViewRect[] = [];

            if (row.item.label) {
                children.push({
                    type: 'text',
                    x: start,
                    y: 0,
                    width: 100,
                    height: labelHeight,
                    textAlign: 'left',
                    text: row.item.label,
                    font: font,
                    color: fontColor,
                    textBaseline: 'top'
                } as Text);
            }

            const labelY = y + definition.yOffset + labelHeight + (definition.rowHeight - labelHeight - padding * 2) / 2;
            if (row.item.startLabel) {
                children.push({
                    type: 'text',
                    x: start - itemHeight / 2,
                    y: labelY,
                    width: 1,
                    height: definition.rowHeight,
                    textAlign: 'right',
                    text: row.item.startLabel,
                    font: font,
                    color: fontColor,
                    textBaseline: 'middle'
                } as Text);
            }
            if (row.item.endLabel) {
                children.push({
                    type: 'text',
                    x: end + itemHeight / 2,
                    y: labelY,
                    width: 1,
                    height: definition.rowHeight,
                    textAlign: 'left',
                    text: row.item.endLabel,
                    font: font,
                    color: fontColor,
                    textBaseline: 'middle'
                } as Text);
            }

            rects.push({
                type: 'rect',
                interactive: true,
                className: 'row',
                id: row.id,
                ...viewport,
                y: y + definition.yOffset,
                height: definition.rowHeight,
                paddingTop: padding,
                paddingBottom: padding,
                children: children.concat([
                    item({
                            type: 'rect',
                            className: 'item',
                            x: start,
                            y: labelHeight,
                            width: end - start,
                            height: itemHeight,
                            backgroundColor: row.item.color,
                            borderRadius: 3,
                        },
                        definition)
                ])
            } as ViewRect);
        }
        y += definition.rowHeight;
        if (row.children?.length > 0) {
            rects = rects.concat(itemsFromRows(row.children, axis, definition, viewport, ctx, labelHeight, y));
            y += rowCount(row.children) * definition.rowHeight;
        }
    }
    ctx.save();
    return rects;
};

const item = (rect: ViewRect, definition: Definition): ViewRect => {

    const borderWidth: number = Math.floor(rect.height / 4) + 1;
    const circleDiameter = rect.height - borderWidth;
    const circleRadius = circleDiameter / 2;
    const circleLeft: ViewRect = {
        type: 'rect',
        x: borderWidth / 2,
        y: (rect.height - circleDiameter) / 2,
        width: circleDiameter,
        height: circleDiameter,
        borderRadius: circleDiameter,
        className: 'circleLeft',
        backgroundColor: definition.colors?.links ?? '#ffffff',
        borderColor: rect.backgroundColor,
        borderWidth: borderWidth,
        interactive: true,
    };

    const rightDiameter: number = Math.floor(rect.height / 2);
    const circleRight: ViewRect = {
        type: 'rect',
        x: rect.width + circleRadius + (borderWidth - rightDiameter) / 2,
        y: (rect.height - rightDiameter) / 2,
        width: rightDiameter,
        height: rightDiameter,
        borderRadius: circleDiameter,
        className: 'circleRight',
        backgroundColor: rect.backgroundColor,
        interactive: false,
    };

    const parentRect = { ...rect };
    parentRect.x -= circleRadius;
    parentRect.width += circleDiameter + borderWidth;
    parentRect.children = [rect, circleLeft, circleRight];
    delete parentRect.backgroundColor;
    delete parentRect.className;

    const handle: ViewRect = {
        type: 'rect',
        x: rect.width - (circleRadius + (borderWidth - rightDiameter) / 2) - 8,
        y: 4,
        height: rect.height - 8,
        width: circleDiameter + 8,
        interactive: true,
        className: 'handle',
        children: [
            {
                type: 'rect',
                x: 1,
                y: 0,
                width: 1,
                height: rect.height - 8,
                backgroundColor: 'rgba(0, 0, 0, 0.3)'
            },
            {
                type: 'rect',
                x: 2,
                y: 0,
                width: 1,
                height: rect.height - 8,
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
            },
            {
                type: 'rect',
                x: 5,
                y: 0,
                width: 1,
                height: rect.height - 8,
                backgroundColor: 'rgba(0, 0, 0, 0.3)'
            },
            {
                type: 'rect',
                x: 6,
                y: 0,
                width: 1,
                height: rect.height - 8,
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }
        ]
    };

    rect.x = circleRadius + borderWidth / 2;
    rect.y = 0;
    rect.interactive = true;
    rect.children = [handle];
    return parentRect;
};

const axisViewModel = (
    model: GanttModel,
    definition: Definition,
    axis: Axis,
    viewport: Rect,
    ctx: CanvasRenderingContext2D
): ViewRect => {
    const children: ViewRect[] = [];
    const options: any = {};
    let labelOptions: any = { year: 'numeric' };
    switch (definition.granularity) {
        case 'd':
            options.day = 'numeric';
            labelOptions.month = 'short';
            break;
        case 'w':
            options.day = 'numeric';
            options.month = 'short';
            break;
        case 'y':
            options.year = 'numeric';
            break;
        case 'm':
        default:
            options.month = 'short';
            break;
    }

    const fontColor = definition.colors?.timelineFont ?? '#333333';
    const font = definition.fonts?.timeline ?? '10pt -apple-system, Helvetica, Calibri';
    ctx.font = font;

    const ticks = new Ticks(axis, definition.granularity);
    let iterator = ticks.iterator();
    let tick = iterator.next();
    while (!tick.done) {
        const text = new Intl.DateTimeFormat('en-US', options).format(tick.value.date);
        const textX = tick.value.position;
        const metrics = ctx.measureText(text);
        children.push({
            type: 'text',
            x: textX,
            y: 40,
            width: metrics.width,
            height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
            text: text,
            color: fontColor,
            font: font,
            textAlign: 'center',
            textBaseline: 'bottom'
        } as Text);

        // children.push({
        //     type: 'rect',
        //     x: textX,
        //     y: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 40,
        //     height: viewport.height,
        //     width: 1,
        //     backgroundColor: 'rgb(230,230,230)'
        // } as ViewRect);

        // check if weekend
        if (definition.granularity === 'd' && tick.value.date.getUTCDay() % 6 === 0) {
            const today = tick.value.date.getUTCDay();
            const tomorrow = new Date(tick.value.date.valueOf());
            const timezoneOffset = tomorrow.getTimezoneOffset();
            while (tomorrow.getUTCDay() === today) {
                tomorrow.setUTCHours(tomorrow.getUTCHours() + 1, timezoneOffset);
            }

            const tomorrowPoint = axis.toPoint(tomorrow.valueOf());
            children.push({
                type: 'rect',
                x: textX,
                y: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 41,
                height: viewport.height,
                width: tomorrowPoint - textX,
                backgroundColor: definition.colors?.weekend ?? parttern(),
            } as ViewRect)
        }

        tick = iterator.next();
    }

    iterator = ticks.iterator(definition.granularity === 'd' ? 'm' : 'y');
    tick = iterator.next();
    let prevLabelRight: number | undefined;
    while (!tick.done) {
        const text = new Intl.DateTimeFormat('en-US', labelOptions).format(tick.value.date);
        const metrics = ctx.measureText(text);
        const xOffset = metrics.width / 2; // center justified
        let textX = tick.value.position;
        if (textX - xOffset < 0) {
            textX = metrics.width / 2;
            if (prevLabelRight) {
                children.pop();
            }
            prevLabelRight = metrics.width;
        } else if (prevLabelRight && prevLabelRight >= textX - xOffset) {
            prevLabelRight = undefined;
            children.pop();
        }
        children.push({
            type: 'text',
            x: textX,
            y: 2,
            width: metrics.width,
            height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
            text: text,
            color: fontColor,
            font: font,
            textAlign: 'center',
            textBaseline: 'top'
        } as Text);
        tick = iterator.next();
    }

    return {
        type: 'rect',
        ...viewport,
        children: children
    };
};

let _pattern: CanvasPattern;
const parttern = () => {
    if (_pattern) {
        return _pattern;
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const color1 = "rgba(0, 0, 0, 0.1)";
    const color2 = "rgba(255, 255, 255, 0)";
    const numberOfStripes = 100;
    for (var i = 0; i < numberOfStripes * 2; i++) {
        const thickness = 300 / numberOfStripes;
        ctx.beginPath();
        ctx.strokeStyle = i % 2 ? color1 : color2;
        ctx.lineWidth = thickness;
        ctx.moveTo(i * thickness + thickness / 2 - 300, 0);
        ctx.lineTo(0 + i * thickness + thickness / 2, 300);
        ctx.stroke();
    }
    _pattern = ctx.createPattern(canvas, 'repeat');
};

const axisAreaModel = (
    model: GanttModel,
    definition: Definition,
    viewport: Rect,
    ctx: CanvasRenderingContext2D
): ViewRect => {
    return {
        type: 'rect',
        x: 0,
        y: 0,
        width: viewport.width,
        height: definition.rowHeight,
        backgroundColor: definition.colors?.timeline ?? '#ffffff',
        children: []
    };
};

const rowLinesViewModel = (
    model: GanttModel,
    definition: Definition,
    viewport: Rect,
    ctx: CanvasRenderingContext2D
): ViewRect => {

    const children: ViewRect[] = [];
    const len = rowCount(model.rows);
    for (let i = 0; i < len; i++) {
        children.push({
            type: 'rect',
            width: viewport.width,
            height: 1,
            x: 0,
            y: (i + 1) * definition.rowHeight + definition.yOffset,
            backgroundColor: definition.colors?.rowBorder ?? 'rgb(230, 230, 230)'
        });
    }
    return {
        x: 0,
        y: 0,
        width: viewport.width,
        height: len * definition.rowHeight,
        type: 'rect',
        children: children
    };
};

const leftColumnViewModel = (
    model: GanttModel,
    definition: Definition,
    viewport: Rect,
    ctx: CanvasRenderingContext2D
): ViewRect => {
    const rect = {
        x: 0,
        y: 0,
        width: definition.columnWidth,
        height: viewport.height
    };

    return {
        ...rect,
        type: 'rect',
        backgroundColor: definition.colors?.leftColumn ?? '#ffffff',
        children: rowLabels(model.rows, definition, 5, definition.yOffset, rect, ctx)
    };
};

const rowLabels = (
    rows: RowModel[],
    definition: Definition,
    x: number,
    y: number,
    viewport: Rect,
    ctx: CanvasRenderingContext2D
): ViewRect[] => {
    let shapes: ViewRect[] = [];
    let labelY: number = definition.rowHeight / 2;

    const font = definition.fonts?.rows ?? '10pt -apple-system, Helvetica, Calibri';
    const color = definition.colors?.rowFont ?? '#000000';
    const len: number = rows.length;
    for (let i = 0; i < len; i++) {
        const row = rows[i];
        if (collides(viewport, { x: x, y: y, width: 1, height: definition.rowHeight })) {
            shapes.push(textFromLabel(row.label, font, color, x, y + labelY));
        }
        y += definition.rowHeight;

        if (row.children) {
            shapes = shapes.concat(rowLabels(row.children, definition, x + 10, y, viewport, ctx));
            y += rowCount(row.children) * definition.rowHeight;
        }
    }
    return shapes;
}

const textFromLabel = (label: string, font: string, color: string, x: number, y: number): Text => {
    return {
        type: 'text',
        font: font,
        text: label,
        color: color,
        width: Number.MAX_SAFE_INTEGER,
        height: 12,
        textAlign: 'left',
        textBaseline: 'middle',
        x: x,
        y: y,
    };
};

export interface IElementWithParent {
    element: ViewRect;
    parent: IElementWithParent | null;
}
class ElementWithParent implements IElementWithParent {
    constructor(public element: ViewRect, public parent: ElementWithParent | null) { }
}

export const interactiveElementInView = (rect: Rect | undefined, element: ViewRect | undefined): IElementWithParent | null => {
    let el = elementInView(rect, element);
    while (Boolean(el) && !Boolean(el.element.interactive)) {
        const len = el.element.children?.length ?? 0;
        for (let i = 0; i < len; i++) {
            const childRect = {
                ...rect,
                x: rect.x - el.element.x - (el.element.paddingLeft ?? 0),
                y: rect.y - el.element.y - (el.element.paddingTop ?? 0)
            };
            const child = elementInView(childRect, el.element.children[i]);
            if (child?.element?.interactive) {
                return child;
            }
        }
        el = el.parent;
    }
    return el;
};

export const elementInView = (rect: Rect | undefined, element: ViewRect | undefined, parent: ElementWithParent = null): IElementWithParent | null => {
    if (!rect || !element) {
        return null;
    }
    if (collides(rect, element)) {
        const childrenLen = element.children?.length ?? 0;
        if (childrenLen > 0) {
            const paddingTop = element.paddingTop ?? 0;
            const paddingLeft = element.paddingLeft ?? 0;

            for (let i = childrenLen - 1; i >= 0; i--) {
                const child = element.children[i];
                const rectForChild = {
                    x: rect.x - (element.x + paddingLeft),
                    y: rect.y - (element.y + paddingTop),
                    width: rect.width,
                    height: rect.height,
                };
                if (rectForChild.x >= 0 && rectForChild.y >= 0) {
                    const childEl = elementInView(rectForChild, child, new ElementWithParent(element, parent));
                    if (childEl) {
                        return childEl;
                    }
                }
            }
        }
        return new ElementWithParent(element, parent);
    }
    return null
};

export const offsetRect = (el: ElementWithParent): Rect => {
    let paddingLeft = (el.element as ViewRect).paddingLeft ?? 0;
    let paddingTop = (el.element as ViewRect).paddingTop ?? 0;
    const rect: Rect = {
        x: el.element.x + paddingLeft,
        y: el.element.y + paddingTop,
        ...shapeMetrics(el.element)
    };

    while (el.parent) {
        el = el.parent;
        paddingLeft = (el.element as ViewRect).paddingLeft ?? 0;
        paddingTop = (el.element as ViewRect).paddingTop ?? 0;

        rect.x += el.element.x + paddingLeft;
        rect.y += el.element.y + paddingTop;
    }

    return rect;
};

export const shapeMetrics = (shape: ViewRect): { width: number, height: number } => {
    const shapeAsAny = shape as any;
    let width: number | undefined;
    let height: number | undefined;
    if (typeof shapeAsAny.width === 'number') {
        width = shapeAsAny.width;
    }
    if (typeof shapeAsAny.height === 'number') {
        height = shapeAsAny.height;
    }

    return {
        width: width,
        height: height,
    };
};

