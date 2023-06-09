import { GanttModel, PeriodType, RowModel } from "./models";

/**
 * Day in milliseconds
 */
export const DAY = 1000 * 60 * 60 * 24;

/**
 * give a "unique id"
 * @returns
 */
export const uuid = (): string => {
    return `${window.performance.now()}.${Math.random()}`;
}

/**
 * Find a row model by way of a given id
 * @param rows
 * @param id
 * @returns
 */
export const findById = (rows: RowModel[], id: string): RowModel | null => {
    const len = rows.length;
    for (let i = 0; i < len; i++) {
        const row = rows[i];
        if (row.id === id) {
            return row;
        } else if (row.children) {
            const child = findById(row.children, id);
            if (child) {
                return child;
            }
        }
    }

    return null;
};

/**
 * Find a row model by way of sequential index
 * @param rows
 * @param id
 * @returns
 */
export const findByIndex = (rows: RowModel[], index: number): RowModel | null => {
    const len = rows.length;
    for (let i = 0; i < len; i++) {
        const row = rows[i];
        if (i = index) {
            return row;
        } else if (row.children) {
            const childIndex = index - i - 1;
            const childCount = rowCount(row.children);
            if (childIndex - childCount <= 0) {
                const child = findByIndex(row.children, childIndex);
                if (child) {
                    return child;
                }
            }
        }
    }

    return null;
};

export const childrenExtrema = (rows: RowModel[]): { start: number, end: number } => {
    let start: number = Number.MAX_SAFE_INTEGER;
    let end: number = Number.MIN_SAFE_INTEGER;

    const len = rows.length;
    for (let i = 0; i < len; i++) {
        const row = rows[i];
        if (row.item) {
            start = start > row.item.start ? row.item.start : start;
            end = end < row.item.end ? row.item.end : end;
        }
        if (row.children.length) {
            const child = childrenExtrema(row.children);
            start = start > child.start ? child.start : start;
            end = end < child.end ? child.end : end;
        }
    }

    return {
        start: start,
        end: end
    };
};

/**
 * Align items linked with an `after` id
 * ensures the item starts after the end of the `after` item
 * @param model
 * @param rows
 */
export const syncLinkedItems = (model: GanttModel, rows: RowModel[] = model.rows): void => {
    const len = rows.length;
    for (let i = 0; i < len; i++) {
        const row = rows[i];
        const item = row?.item;
        if (item?.after) {
            const afterRow = findById(model.rows, item.after);
            if (afterRow?.item && item.start !== afterRow?.item.end) {
                const delta = afterRow.item.end - item.start;
                item.start = afterRow.item.end;
                item.end += delta;
            }
        }
        if (row.children?.length > 0) {
            syncLinkedItems(model, row.children);
        }
    }
};

/**
 * ensures the start is before the end value
 * @param rows
 */
export const validateStartEnd = (rows: RowModel[]): void => {
    const len = rows.length;
    for (let i = 0; i < len; i++) {
        const row = rows[i];
        const item = row.item;
        if (item) {
            if (item.start > item.end) {
                const end = item.start;
                item.start = item.end;
                item.end = end;
            }
            // ensure at least one day long
            const delta = item.end - item.start;
            if (delta < DAY) {
                item.end = item.start + DAY;
            }
            item.start = Math.floor(item.start);
            item.end = Math.floor(item.end);
        }
        if (row.children) {
            validateStartEnd(row.children);
        }
    }
};

/**
 * Find the min/max of the start/end values
 * @param rows
 * @param granularity
 * @returns
 */
export const axisExtrema = (rows: RowModel[], granularity: PeriodType): { min: number, max: number } => {
    // rows and axis sizing
    let minDate = Number.MAX_SAFE_INTEGER;
    let maxDate = 0;
    const len = rows.length;
    for (let i = 0; i < len; i++) {
        const row = rows[i];
        if (row.children) {
            const childrenExtrema = axisExtrema(row.children, granularity);
            minDate = minDate < childrenExtrema.min ? minDate : childrenExtrema.min;
            maxDate = maxDate > childrenExtrema.max ? maxDate : childrenExtrema.max;
        }
        if (row.item) {
            minDate = minDate < row.item.start ? minDate : row.item.start;
            maxDate = maxDate > row.item.end ? maxDate : row.item.end;
        }
    }
    return {
        min: minDate,
        max: maxDate
    };
};

/**
 * ensure the model is in ship-shape
 * @param model
 * @returns
 */
export const validateModel = (model: GanttModel): GanttModel => {
    syncLinkedItems(model);
    validateStartEnd(model.rows);
    return model;
};

/**
 * count the rows and their children
 */
export const rowCount = (rows: RowModel[], ignoreCollapsed: boolean = false): number => {
    let count = 0;
    const len = rows.length;
    for (let i = 0; i < len; i++) {
        count += 1;
        const row = rows[i];
        if (row.children.length && !(row.collapsed && ignoreCollapsed)) {
            count += rowCount(row.children);
        }
    }
    return count;
};

export type TextToFitMetrics = { lines: string[], width: number, height: number };
export const textToFit = (text: string, width: number, height: number, ctx: CanvasRenderingContext2D): TextToFitMetrics => {
    const words: string[] = text.split(' ');
    const len: number = words.length;
    const lines: TextToFitMetrics[] = [];
    let prevMetrics: TextMetrics;
    let line: string = '';
    let y: number = 0;

    for (let i = 0; i < len; i++) {
        const word = words[i];
        const tempLine = line ? line + ' ' + word : word;
        const metrics = ctx.measureText(tempLine);
        if (metrics.width > width) {
            if (prevMetrics) {
                const h = prevMetrics.fontBoundingBoxAscent + prevMetrics.fontBoundingBoxDescent;
                y += h;
                if (y >= height) {
                    break;
                }
                lines.push({ lines: [line], width: prevMetrics.width, height: h});
                prevMetrics = undefined;
                line = '';
                i -= 1;
            } else {
                lines.push({ lines: [tempLine], width: metrics.width, height: metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent });
            }
        } else {
            line = tempLine;
            prevMetrics = metrics;
        }
    }

    if (line && prevMetrics.width < width) {
        const h = prevMetrics.fontBoundingBoxAscent + prevMetrics.fontBoundingBoxDescent;
        if (y + h < height) {
            lines.push({ lines: [line], width: prevMetrics.width, height: h});
            line = '';
        }
    }
    if (line) {
        const lastline = lines[lines.length - 1];
        lastline.lines[0] = truncateLine(lastline.lines[0], width, ctx);
    }

    return lines.reduce((prev: TextToFitMetrics, curr: TextToFitMetrics): TextToFitMetrics => {
        return {
            lines: prev.lines.concat(curr.lines),
            width: Math.max(prev.width, curr.width),
            height: prev.height + curr.height,
        }
    });
};

export const truncateLine = (text: string, width: number, ctx: CanvasRenderingContext2D): string => {
    const ellipsis = '\u{2026}';
    const words = text.split(' ');
    text += ellipsis;
    let metrics = ctx.measureText(text);
    while (metrics.width > width && words.length > 0) {
        words.pop();
        text = words.join(' ') + ellipsis;
        metrics = ctx.measureText(text);
    }

    return text;
};


/**
 * Calculates the distance between two points
 * @param x0
 * @param y0
 * @param x1
 * @param y1
 * @returns
 */
export const distance = (x0: number, y0: number, x1: number, y1: number): number => {
    // (x0 - x2)^2 + (y0 - y1)^2 = c^2
    return Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
};
