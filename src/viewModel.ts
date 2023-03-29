import { Axis } from "./axis";
import { rowCount } from "./modelOperations";
import { Definition, GanttModel, RowModel } from "./models";
import { ViewRect, Shape, Text, Rect, collides } from "./renderHelper";
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

    const axisView = axisViewModel(model, definition, axis, { ...viewport, x: left.width, width: viewport.width - left.width }, ctx);
    const itemView = itemViewModel(model, definition, axis, viewport, left.width, ctx);

    return {
        ...viewport,
        type: 'rect',
        backgroundColor: 'rgb(240, 240, 240)',
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
                ]
            }
        ]
    };
};

const itemViewModel = (
    model: GanttModel,
    definition: Definition,
    axis: Axis,
    viewport: Rect,
    columnWidth: number,
    ctx: CanvasRenderingContext2D
): ViewRect => {
    return {
        ...viewport,
        type: 'rect',
        children: itemsFromRows(model.rows, axis, definition, {...viewport, paddingLeft: columnWidth })
    };
};

const itemsFromRows = (rows: RowModel[], axis: Axis, definition: Definition, viewport: Rect, y: number = 0): ViewRect[] => {
    let rects: ViewRect[] = [];
    const len: number = rows.length;

    for (let i = 0; i < len; i++) {
        const row = rows[i];
        if (row.item) {
            const start = axis.toPoint(row.item.start);
            const end = axis.toPoint(row.item.end);
            rects.push({
                type: 'rect',
                id: row.id,
                ...viewport,
                y: y,
                height: definition.rowHeight,
                paddingTop: 8,
                paddingBottom: 8,
                children: [{
                    type: 'rect',
                    x: start,
                    y: 0,
                    width: end - start,
                    height: definition.rowHeight,
                    backgroundColor: 'purple',
                    children: [
                        {
                            type: 'rect',
                            x: end - start - 14,
                            y: 4,
                            height: definition.rowHeight - 24,
                            width: 8,
                            id: 'handle',
                            backgroundColor: 'black'
                        }
                    ]
                } as ViewRect]
            } as ViewRect);
        }
        y += definition.rowHeight;
        if (row.children.length > 0) {
            rects = rects.concat(itemsFromRows(row.children, axis, definition, viewport, y));
            y += rowCount(row.children) * definition.rowHeight;
        }
    }

    return rects;
}

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
            color: 'black',
            font: '10pt -apple-system, Helvetica, Calibri',
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
                y: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 40,
                height: viewport.height,
                width: tomorrowPoint - textX,
                backgroundColor: 'rgba(0, 0, 0, 0.2)'
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
            color: '#333',
            font: '10pt -apple-system, Helvetica, Calibri',
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
        backgroundColor: 'white',
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
            backgroundColor: 'rgb(230, 230, 230)'
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
        width: 200,
        height: viewport.height
    };

    return {
        ...rect,
        type: 'rect',
        backgroundColor: 'white',
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

    const len: number = rows.length;
    for (let i = 0; i < len; i++) {
        const row = rows[i];
        if (collides(viewport, { x: x, y: y, width: 1, height: definition.rowHeight })) {
            shapes.push(textFromLabel(row.label, x, y + labelY));
        }
        y += definition.rowHeight;

        if (row.children) {
            shapes = shapes.concat(rowLabels(row.children, definition, x + 10, y, viewport, ctx));
            y += rowCount(row.children) * definition.rowHeight;
        }
    }
    return shapes;
}

const textFromLabel = (label: string, x: number, y: number): Text => {
    return {
        type: 'text',
        font: '10pt -apple-system, Helvetica, Calibri',
        text: label,
        color: '#000',
        width: Number.MAX_SAFE_INTEGER,
        height: 12,
        textAlign: 'left',
        textBaseline: 'middle',
        x: x,
        y: y,
    };
};

class ElementWithParent {
    constructor(public element: Shape, public parent: ElementWithParent | null) {}
}

export const elementInView = (rect: Rect, element: ViewRect, parent: ElementWithParent = null): ElementWithParent | null => {
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


