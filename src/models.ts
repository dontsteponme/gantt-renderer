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
    columnWidth: number;
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

export type ViewRectType = 'rect' | 'text';

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

export interface ViewRect extends Rect {
    children?: ViewRect[];
    id?: string; // maps to row model
    className?: string; // selector
    interactive?: boolean; // interaction manager cares about it
    type: ViewRectType;
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
