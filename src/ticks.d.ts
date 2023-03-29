import { Axis } from "./axis";
import { PeriodType } from "./models";
export interface Tick {
    date: Date;
    position: number;
}
export declare class Ticks {
    private _axis;
    private _periodType;
    constructor(_axis: Axis, _periodType: PeriodType);
    iterator(periodType?: PeriodType): Iterator<Tick>;
    private _nextPeriod;
    private _nearestPeriod;
}
