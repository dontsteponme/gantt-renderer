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
        const item = row.item;
        if (item?.after) {
            const afterRow = findById(model.rows, item.after);
            if (item.start !== afterRow?.item.end) {
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
