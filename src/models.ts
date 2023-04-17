export type PeriodType = 'd' | 'w' | 'm' | 'y';

export interface GanttModel {
    rows: RowModel[];
    milestones: Milestone[];
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
    startLabel?: string;
    endLabel?: string;
    color?: string;
    after?: string;
}

export interface Milestone {
    name?: string,
    date: number,
    color: string,
}

export interface Definition {
    rowHeight: number;
    yOffset: number;
    granularity: PeriodType;
    axis?: {
        start: number,
        end: number,
    };
    colors?: {
        canvas?: string;
        links?: string;
        timeline?: string;
        timelineFont?: string;
        leftColumn?: string;
        rowBorder?: string;
        rowFont?: string;
        weekend?: string;
        itemLabels?: string;
    };
    fonts?: {
        rows?: string;
        timeline?: string;
        item?: string;
    }
}
