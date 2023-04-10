import { GanttModel, PeriodType, RowModel } from "./models";

export const DAY = 1000 * 60 * 60 * 24;

export const uuid = (): string => {
    return `${window.performance.now()}.${Math.random()}`;
}

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
    if (maxDate > 0 && minDate < Number.MAX_SAFE_INTEGER) {
        let padding: number = DAY;
        switch (granularity) {
            case 'd':
                padding *= 2;
                break;
            case 'w':
                padding *= 7;
                break;
            case 'm':
            default:
                padding *= 30;
                break;
        }
        return {
            min: minDate - padding,
            max: maxDate + padding
        };
    } else {
        return {
            min: minDate,
            max: maxDate
        };
    }
};

export const validateModel = (model: GanttModel): GanttModel => {
    syncLinkedItems(model);
    validateStartEnd(model.rows);
    return model;
};

export const rowCount = (rows: RowModel[]): number => {
    let count = 0;
    const len = rows.length;
    for (let i = 0; i < len; i++) {
        count += 1;
        const row = rows[i];
        if (row.children) {
            count += rowCount(row.children);
        }
    }
    return count;
};
