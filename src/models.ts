export type PeriodType = 'd' | 'w' | 'm' | 'y';

export interface GanttModel {
    rows: RowModel[];
    milestones: Milestone[];
}

export interface RowModel {
    id: string;
    label: string;
    adornmentColor?: string;
    children: RowModel[];
    item?: ItemModel;
    collapsed?: boolean;
    collapsedLabel?: string;
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
    name?: string;
    date: number;
    color: string;
}

export interface Plugin {
    section: '';

}

export interface Definition {
    rowHeight: number; // height of each row
    footerHeight?: number; // space at bottom when we scoll up. Defaults to rowHeight
    collapsible?: boolean; // can collapse parents with no item
    columnWidth: number; // width of the task column
    yOffset: number; // vertical scroll offset
    granularity: PeriodType; // desired axis granularity
    highlightedIds?: string[]; // rows to express highlighted state
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
        columnBorder?: string;
        rowFont?: string;
        weekend?: string;
        itemLabels?: string;
        highlight?: string;
    };
    fonts?: {
        rows?: string;
        timeline?: string;
        item?: string;
    },
    shadows?: {
        highlight?: {
            blur: number;
            color: string;
        };
    },
    plugins?: Plugin[],
}

export type ViewRectType = 'rect' | 'text' | 'custom';

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
    background?: string | CanvasGradient | CanvasPattern;
    borderRadius?: number;
    shadowColor?: string;
    shadowBlur?: number;
}

export interface Text extends ViewRect {
    text: string;
    font: string;
    color: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
}

export interface Custom extends ViewRect {
    render: (ctx: CanvasRenderingContext2D, bounds: ViewRect) => void;
}
