import { GanttModel, PeriodType, RowModel } from "./models";
export declare const DAY: number;
export declare const uuid: () => string;
export declare const findById: (rows: RowModel[], id: string) => RowModel | null;
export declare const syncLinkedItems: (model: GanttModel, rows?: RowModel[]) => void;
export declare const validateStartEnd: (rows: RowModel[]) => void;
export declare const axisExtrema: (rows: RowModel[], granularity: PeriodType) => {
    min: number;
    max: number;
};
export declare const validateModel: (model: GanttModel) => GanttModel;
export declare const rowCount: (rows: RowModel[]) => number;
