import { Axis } from "./axis";
import { childrenExtrema, rowCount, textToFit } from "./modelOperations";
import { Definition, GanttModel, Milestone, RowModel, ViewRect, Text, Rect, Custom } from "./models";
import { collides } from "./renderHelper";
import { Ticks } from "./ticks";

export const viewModelFromModel = (
    model: GanttModel,
    definition: Definition,
    axis: Axis,
    viewport: Rect,
    ctx: CanvasRenderingContext2D
): ViewRect => {

    const axisAreaTop = axisAreaModel(model, definition, viewport, ctx);
    const left = leftColumnViewModel(model, definition, viewport, ctx, 'rowLabels');
    const leftBackground = leftColumnViewModel(model, definition, viewport, ctx);
    leftBackground.background = definition.colors?.leftColumn ?? '#ffffff';
    leftBackground.children.length = 0;

    const leftShadow = leftGradient({...viewport, x: left.width}, ctx);
    const rowViewport = {...viewport, y: viewport.y + axisAreaTop.height, height: viewport.height - axisAreaTop.height};
    const rows = rowLinesViewModel(model, definition, rowViewport, ctx);

    const axisViewport = { ...viewport, x: left.width, width: viewport.width - left.width };
    const labelArea = Math.ceil(labelHeight(model.rows, definition, ctx)) + 4;
    const axisView = axisViewModel(model, definition, axis, axisViewport, axisAreaTop.height, ctx);
    const itemView = itemViewModel(model, definition, axis, viewport, left.width, ctx, labelArea);
    const references = milestones(model.milestones ?? [], definition, axis, { ...axisViewport, y: axisAreaTop.height - 10 });
    const links = linksFromRow(model.rows, definition, itemView, ctx, 0, labelArea);
    const linkViewRect: ViewRect = {
        type: 'rect',
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height - axisAreaTop.height,
        paddingLeft: left.width,
        children: links,
    };

    return {
        ...viewport,
        type: 'rect',
        background: definition.colors?.canvas ?? 'rgb(240, 240, 240)',
        children: [
            axisAreaTop,
            axisView,
            rows,
            {
                type: 'rect',
                className: 'rowArea',
                x: 0,
                y: axisAreaTop.height,
                height: viewport.height - axisAreaTop.height,
                width: viewport.width,
                children: [
                    leftBackground,
                    left,
                    itemView,
                    linkViewRect,
                ]
            },
            references,
            leftShadow,
        ]
    };
};

const leftGradient = (viewport: Rect, ctx: CanvasRenderingContext2D): ViewRect => {
    const w = 4;
    const gradient = ctx.createLinearGradient(viewport.x, 0, viewport.x + w, 0);

    // Add three color stops
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0");

        return {
        ...viewport,
        width: w,
        type: 'rect',
        background: gradient,
    };
}

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
            background: milestone.color
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
                background: milestone.color,
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
            const linkedRow = getById(row.id, itemView);
            if (!Boolean(afterRow && linkedRow)) {
                continue; // drop out. only links to things in view
            }
            const afterItem = getByClassName('item', afterRow.element);
            const linkedItem = getByClassName('item', linkedRow.element);

            if (afterItem?.element && linkedItem?.element) {
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
                    background: definition.colors?.links ?? 'rbga(255, 255, 255, 0.4)',
                });
                rects.push({
                    type: 'rect',
                    x: x - r,
                    y: afterRow.element.y - r + (definition.rowHeight + labelHeight) / 2,
                    width: d,
                    height: d,
                    background: definition.colors?.links ?? '#ffffff',
                    borderRadius: r,
                });
            }
        }

        index += 1;
        if (row.children?.length > 0) {
            rects = rects.concat(linksFromRow(row.children, definition, itemView, ctx, index, labelHeight));
        }
    }
    return rects;
};

export const getByClassName = (name: string, shape: ViewRect, parent: IElementWithParent | null = null): IElementWithParent | null => {
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
        paddingLeft: columnWidth,
        type: 'rect',
        className: 'canvas',
        interactive: true,
        children: itemsFromRows(model.rows, axis, definition, viewport, ctx, labelHeight)
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
        const rowY: number = y + definition.yOffset;
        // break when we get below the fold
        if (rowY > viewport.height) {
            break;
        }
        // make sure we are within the viewport
        const withinView: boolean = rowY + definition.rowHeight > 0;
        if (withinView) {
            const children: ViewRect[] = [];
            const labelY = labelHeight + itemHeight / 2;
            if (row.item) {
                const start = axis.toPoint(row.item.start);
                const end = axis.toPoint(row.item.end);
                if (row.item.label) {
                    children.push({
                        type: 'text',
                        x: start + padding,
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
                children.push(item(
                    {
                        type: 'rect',
                        className: 'item',
                        x: start,
                        y: labelHeight,
                        width: end - start,
                        height: itemHeight,
                        background: row.item.color,
                        borderRadius: 3,
                    },
                    definition
                ));
            } else if (Boolean(row.collapsed) && row.children.length) {
                const color = row.item?.color ?? fontColor ?? '#000000';
                const { start, end } = childrenExtrema(row.children);
                const startPoint = axis.toPoint(start);
                const width = axis.toPoint(end) - startPoint;
                children.push({
                    type: 'rect',
                    interactive: false,
                    className: 'parentItem',
                    x: startPoint,
                    y: labelHeight,
                    width: width,
                    height: itemHeight,
                    children:[
                        {
                            type: 'rect',
                            interactive: false,
                            x: 0,
                            y: itemHeight / 2,
                            width: width,
                            height: 1,
                            background: color
                        },
                        {
                            type: 'rect',
                            interactive: false,
                            x: 0,
                            y: 0,
                            width: 1,
                            height: itemHeight,
                            background: color
                        },
                        {
                            type: 'rect',
                            interactive: false,
                            x: width - 1,
                            y: 0,
                            width: 1,
                            height: itemHeight,
                            background: color
                        },
                    ],
                });
                if (row.collapsedLabel) {
                    children.push({
                        type: 'text',
                        interactive: false,
                        x: startPoint + width / 2,
                        y: labelY,
                        textAlign: 'center',
                        text: row.collapsedLabel,
                        font: font,
                        color: fontColor,
                        textBaseline: 'bottom'
                    } as Text);
                }
            }
            rects.push({
                type: 'rect',
                interactive: true,
                className: 'row',
                id: row.id,
                ...viewport,
                y: rowY,
                height: definition.rowHeight,
                paddingTop: padding,
                paddingBottom: padding,
                children: children,
            } as ViewRect);
        }
        y += definition.rowHeight;
        if (row.children?.length > 0) {
            if (!(Boolean(row.collapsed) && definition.collapsible)) {
                const childrenHeight = rowCount(row.children) * definition.rowHeight;
                // check if children will be visible
                if (y + childrenHeight > 0) {
                    rects = rects.concat(itemsFromRows(row.children, axis, definition, viewport, ctx, labelHeight, y));
                }
                y += childrenHeight;
            }
        }
    }
    return rects;
};

const item = (rect: ViewRect, definition: Definition): ViewRect => {

    const borderWidth: number = Math.floor(rect.height / 4) + 1;
    const circleDiameter = Math.floor(rect.height - borderWidth);
    const circleRadius = Math.floor(circleDiameter / 2);
    const circleLeft: ViewRect = {
        type: 'rect',
        x: borderWidth / 2,
        y: (rect.height - circleDiameter) / 2,
        width: circleDiameter,
        height: circleDiameter,
        borderRadius: circleDiameter,
        className: 'circleLeft',
        background: definition.colors?.links ?? '#ffffff',
        borderColor: typeof rect.background === 'string' ? rect.background : undefined,
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
        className: 'handle',
        background: rect.background,
        interactive: true,
    };

    const parentRect = { ...rect };
    parentRect.x -= circleRadius;
    parentRect.width += circleDiameter + borderWidth;
    parentRect.children = [circleRight, rect, circleLeft];
    delete parentRect.background;
    delete parentRect.className;

    const handle: ViewRect = {
        type: 'rect',
        x: rect.width - (circleRadius + (borderWidth - rightDiameter) / 2) - 10,
        y: 0,
        height: rect.height,
        width: circleDiameter + 10,
        interactive: true,
        className: 'handle',
        paddingTop: 4,
        paddingBottom: 4,
        children: [
            {
                type: 'rect',
                x: 4,
                y: 0,
                width: 1,
                height: rect.height - 8,
                background: 'rgba(0, 0, 0, 0.3)'
            },
            {
                type: 'rect',
                x: 5,
                y: 0,
                width: 1,
                height: rect.height - 8,
                background: 'rgba(255, 255, 255, 0.2)'
            },
            {
                type: 'rect',
                x: 7,
                y: 0,
                width: 1,
                height: rect.height - 8,
                background: 'rgba(0, 0, 0, 0.3)'
            },
            {
                type: 'rect',
                x: 8,
                y: 0,
                width: 1,
                height: rect.height - 8,
                background: 'rgba(255, 255, 255, 0.2)'
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
    labelRenderingHeight: number,
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
    let prevLabelRight: number | undefined;

    const ticks = new Ticks(axis, definition.granularity);
    let iterator = ticks.iterator();
    let tick = iterator.next();
    let formatter = new Intl.DateTimeFormat('en-US', options);
    while (!tick.done) {
        const text = formatter.format(tick.value.date);
        const textX = tick.value.position;
        const metrics = ctx.measureText(text);

        if (typeof prevLabelRight === 'undefined' || prevLabelRight < textX) {
            children.push({
                type: 'text',
                x: textX,
                y: 40,
                width: metrics.width,
                height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
                text: text,
                color: fontColor,
                font: font,
                textAlign: 'left',
                textBaseline: 'bottom'
            } as Text);
            prevLabelRight = textX + metrics.width;
        }

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
                y: labelRenderingHeight,
                height: viewport.height,
                width: tomorrowPoint - textX,
                background: definition.colors?.weekend ?? parttern(),
            } as ViewRect);
        }

        if (definition.colors?.columnBorder) {
            children.push({
                type: 'rect',
                x: textX,
                y: labelRenderingHeight,
                height: viewport.height,
                width: 1,
                background: definition.colors?.columnBorder,
            } as ViewRect);
        }

        tick = iterator.next();
    }

    const leftPadding: number = 5;
    prevLabelRight = undefined;
    iterator = ticks.iterator(definition.granularity === 'd' ? 'm' : 'y');
    tick = iterator.next();
    formatter = new Intl.DateTimeFormat('en-US', labelOptions);
    while (!tick.done) {
        const text = formatter.format(tick.value.date);
        const metrics = ctx.measureText(text);
        const xOffset = metrics.width / 2; // center justified
        let textX = tick.value.position;
        if (textX - xOffset < leftPadding) {
            textX = metrics.width / 2 + leftPadding;
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
        background: definition.colors?.timeline ?? '#ffffff',
        children: []
    };
};

const rowLinesViewModel = (
    model: GanttModel,
    definition: Definition,
    viewport: Rect,
    ctx: CanvasRenderingContext2D
): ViewRect => {

    const hasHighlight = definition.highlightedIds?.length > 0;
    const len = rowCount(model.rows);

    const rowChildren = (rows: RowModel[], y): ViewRect[] => {
        let rects: ViewRect[] = [];
        const len = rows.length;
        for (let i = 0; i < len; i++) {
            const row = rows[i];
            if (hasHighlight && definition.highlightedIds.indexOf(row.id) > -1) {
                const highlight: ViewRect = {
                    type: 'rect',
                    width: viewport.width,
                    height: definition.rowHeight,
                    x: 0,
                    y: y,
                    background: definition.colors?.highlight ?? 'rgb(255, 255, 255)'
                };
                if (definition.shadows?.highlight) {
                    highlight.shadowBlur = definition.shadows.highlight.blur;
                    highlight.shadowColor = definition.shadows.highlight.color;
                }
                rects.push(highlight);
            }
            if (definition.colors?.rowBorder) {
                rects.push({
                    type: 'rect',
                    width: viewport.width,
                    height: 1,
                    x: 0,
                    y: y + definition.rowHeight - 1,
                    background: definition.colors.rowBorder
                });
            }
            y += definition.rowHeight;
            if (row.children?.length > 0) {
                rects = rects.concat(rowChildren(row.children, y));
                y += rowCount(row.children) * definition.rowHeight;
            }
        }
        return rects;
    };

    const children: ViewRect[] = rowChildren(model.rows, definition.yOffset);

    return {
        x: 0,
        y: viewport.y,
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
    ctx: CanvasRenderingContext2D,
    className?: string,
): ViewRect => {
    const rect = {
        x: 0,
        y: 0,
        width: definition.columnWidth,
        height: viewport.height
    };

    return {
        ...rect,
        className: className,
        type: 'rect',
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
    let hasChildren: boolean = definition.collapsible && rows.some(m => m.children.length > 0);
    const adornmentSpace: number = 5;
    const rowPadding = hasChildren ? 14 : adornmentSpace * 2;
    x += rowPadding;

    const font = definition.fonts?.rows ?? '10pt -apple-system, Helvetica, Calibri';
    const color = definition.colors?.rowFont ?? '#000000';
    const len: number = rows.length;

    for (let i = 0; i < len; i++) {
        const row = rows[i];
        // check if row is in view
        if (collides(viewport, { x: x, y: y, width: 1, height: definition.rowHeight })) {
            // hit target for row
            shapes.push({
                type: 'rect',
                interactive: true,
                id: row.id,
                children: [],
                className: 'row',
                x: 0,
                y: y,
                width: definition.columnWidth,
                height: definition.rowHeight,
            });
            // check for adornment color
            if (row.adornmentColor) {
                shapes.push({
                    type: 'rect',
                    interactive: false,
                    children: [],
                    x: 0,
                    y: y,
                    width: adornmentSpace,
                    height: definition.rowHeight,
                    background: row.adornmentColor,
                });
            }

            // check is label is too long for given space
            let metrics = ctx.measureText(row.label);
            if (metrics.width + x > viewport.width) {
                ctx.font = font;
                const fitMetrics = textToFit(row.label, viewport.width - 20 - x, definition.rowHeight, ctx);
                const centerY = (definition.rowHeight - fitMetrics.height) / 2;
                const perLine = fitMetrics.height / fitMetrics.lines.length;
                fitMetrics.lines.forEach((line: string, i: number) => {
                    shapes.push(textFromLabel(line, font, color, x, y + perLine * i + centerY, 'top'));
                });
            } else {
                shapes.push(textFromLabel(row.label, font, color, x, y + labelY));
            }
        }
        y += definition.rowHeight;

        if (row.children.length) {
            let showChildren: boolean = true;
            if (definition.collapsible && !row.item) {
                if (row.collapsed) {
                    shapes.push(arrow(x - rowPadding + 2, y - definition.rowHeight / 2 - 4, 4, 8, 'right', color));
                    showChildren = false;
                } else {
                    shapes.push(arrow(x - rowPadding, y - definition.rowHeight / 2 - 2, 8, 4, 'down', color));
                }
            }

            if (showChildren) {
                shapes = shapes.concat(rowLabels(row.children, definition, x + 10, y, viewport, ctx));
                y += rowCount(row.children) * definition.rowHeight;
            }
        }
    }
    return shapes;
}

const arrow = (x: number, y: number, w: number, h: number, direction: 'right' | 'down', color: string): Custom => {
    return {
        x: x,
        y: y,
        width: w,
        height: h,
        type: 'custom',
        render: (ctx: CanvasRenderingContext2D, bounds: ViewRect) => {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineCap = 'round';
            ctx.lineWidth = 1;
            switch (direction) {
                case 'right':
                    ctx.moveTo(bounds.x, bounds.y);
                    ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height / 2);
                    ctx.lineTo(bounds.x, bounds.y + bounds.height);
                    break;
                case 'down':
                    ctx.moveTo(bounds.x, bounds.y);
                    ctx.lineTo(bounds.x + bounds.width / 2, bounds.y + bounds.height);
                    ctx.lineTo(bounds.x + bounds.width, bounds.y);
                default:
                    break;
            }
            ctx.stroke();
            ctx.restore();
        }
    };
}

const textFromLabel = (label: string, font: string, color: string, x: number, y: number, baseLine: 'middle' | 'top' = 'middle'): Text => {
    return {
        type: 'text',
        font: font,
        text: label,
        color: color,
        width: Number.MAX_SAFE_INTEGER,
        height: 12,
        textAlign: 'left',
        textBaseline: baseLine,
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
    while (Boolean(el) && !Boolean(el.element?.interactive)) {
        const len = el.element.children?.length ?? 0;
        for (let i = 0; i < len; i++) {
            const childRect = {
                ...rect,
                x: rect.x - el.element.x - (el.element.paddingLeft ?? 0),
                y: rect.y - el.element.y - (el.element.paddingTop ?? 0)
            };
            const child = interactiveElementInView(childRect, el.element.children[i]);
            if (child?.element) {
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

    while (el.parent && el.parent.element) {
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

