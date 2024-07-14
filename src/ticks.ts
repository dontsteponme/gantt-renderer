import { Axis } from "./axis";
import { PeriodType } from "./models";

/**
 * Tick data model
 */
export interface Tick {
    date: Date,
    position: number
}

/**
 * Ticks class produces an iterator for dates
 */
export class Ticks {
    constructor(private _axis: Axis, private _periodType: PeriodType) { }

    /**
     * Iterator for dates based on peried type
     * @param periodType
     * @returns
     */
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

    /**
     * Find the next period based on period type granularity
     * @param value
     * @param periodType
     * @returns
     */
    private _nextPeriod(value: number, periodType: PeriodType): Date {
        const date = new Date(value);
        switch (periodType) {
            case 'y':
                const currYear = date.getFullYear();
                date.setFullYear(currYear + 1);
                break;
            case 'w':
                const dayOfMonth = date.getDate();
                date.setDate(dayOfMonth + 7);
                break;
            case 'm':
                const currMonth = date.getMonth();
                date.setMonth(currMonth + 1);
                break;
            case 'd':
            default:
                date.setDate(date.getDate() + 1);
                break;
        }

        return date;
    }

    /**
     * Find the nearest date period boundary
     * @param value
     * @param periodType
     * @returns
     */
    private _nearestPeriod(value: number, periodType: PeriodType): Date {
        const date = new Date(value);
        switch (periodType) {
            case 'w':
                let dayOfWeek: number = date.getDate();
                const incrementWeek: boolean = dayOfWeek > 2;
                // looping below because calendar math and timezones are giving me a headache
                while (dayOfWeek !== 0) {
                    if (incrementWeek) {
                        date.setHours(date.getHours() + 1);
                    } else {
                        date.setHours(date.getHours() - 1);
                    }
                    dayOfWeek = date.getDay();
                }
                break;
            case 'm':
                let dayOfMonth = date.getDate();
                const incrementMonth = dayOfMonth > 15;
                // looping below because calendar math and timezones are giving me a headache
                while (dayOfMonth !== 1) {
                    date.setDate(
                        incrementMonth ? dayOfMonth + 1 : dayOfMonth - 1
                    );
                    dayOfMonth = date.getDate();
                }
                break;
            case 'y':
                date.setFullYear(date.getFullYear(), 0, 1);
                break;
            case 'd':
            default:
                break;
        }
        return date;
    }
}
