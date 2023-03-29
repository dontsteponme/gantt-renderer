import { Axis } from "./axis";
import { PeriodType } from "./models";

export interface Tick {
    date: Date,
    position: number
}

export class Ticks {
    constructor(private _axis: Axis, private _periodType: PeriodType) { }

    public iterator(periodType: PeriodType = this._periodType): Iterator<Tick> {
        let pointer: Date;
        return {
            next: ():  IteratorResult<Tick> => {
                if (pointer) {
                    pointer = this._nearestPeriod(
                        this._nextPeriod(pointer.valueOf(), periodType).valueOf(),
                        periodType
                    );
                } else {
                    pointer = this._nearestPeriod(this._axis.min, periodType);
                }

                return {
                    done: isNaN(pointer.valueOf()) || pointer.valueOf() > this._axis.max,
                    value: {
                        date: pointer,
                        position: this._axis.toPoint(pointer.valueOf())
                    }
                }
            }
        }
    }

    private _nextPeriod(value: number, periodType: PeriodType): Date {
        const date = new Date(value);
        date.setUTCHours(0, date.getTimezoneOffset(), 0, 0);
        switch (periodType) {
            case 'y':
                const currYear = date.getUTCFullYear();
                date.setUTCFullYear(currYear + 1);
                break;
            case 'w':
                const dateOMonth = date.getUTCDate();
                date.setUTCDate(dateOMonth + 7);
                break;
            case 'm':
                const currMonth = date.getUTCMonth();
                date.setUTCMonth(currMonth + 1);
                break;
            case 'd':
            default:
                date.setUTCDate(date.getUTCDate() + 1);
                break;
        }

        return date;
    }

    private _nearestPeriod(value: number, periodType: PeriodType): Date {
        const date = new Date(value);
        switch (periodType) {
            case 'w':
                const dayOWeek = date.getUTCDay();
                const dateOMonth = date.getUTCDate();
                date.setUTCDate(dateOMonth - dayOWeek);
                break;
            case 'm':
                date.setUTCDate(1);
                break;
            case 'y':
                date.setUTCFullYear(date.getUTCFullYear(), 0, 1);
                break;
            case 'd':
            default:
                break;
        }
        date.setUTCHours(0, date.getTimezoneOffset(), 0, 0);
        return date;
    }
}
