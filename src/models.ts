export type PeriodType = 'd' | 'w' | 'm' | 'y';

export interface GanttModel {
    rows: RowModel[];
    milestones: Milestone[]
}

export interface RowModel {
    id: string;
    label: string;
    item?: ItemModel;
    children: RowModel[];
}

export interface ItemModel {
    label?: string;
    start: number;
    end: number;
    color?: string;
    after?: string;
}

export interface Milestone {
    name: string,
    date: number,
    color: string,
}

export interface Definition {
    rowHeight: number;
    yOffset: number;
    granularity: PeriodType;
}
