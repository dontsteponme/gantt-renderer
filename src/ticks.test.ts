import { Axis } from './axis';
import { DAY } from './modelOperations';
import { Ticks } from './ticks';

const startDate = '01-01-2023';
const axis = new Axis();
axis.range = 100;
axis.min = new Date(startDate).valueOf();
axis.max = axis.min + DAY * 10;

test('Ticks iterator days', () => {
    const ticks = new Ticks(axis, 'd');
    const iterator = ticks.iterator();
    const date = new Date(startDate);
    let counter = 0;
    let tick = iterator.next();
    while (!tick.done) {
        expect(tick.done).toBe(false);
        expect(tick.value.date.getUTCDate()).toBe(date.getUTCDate());
        date.setUTCDate(date.getUTCDate() + 1);
        tick = iterator.next();
        counter += 1;
    }

    expect(counter).toBe(11);
    expect(tick.done).toBe(true);
});

test('Ticks iterator week', () => {
    axis.max = axis.min + DAY * 7 * 10;

    const date = new Date(startDate);
    const ticks = new Ticks(axis, 'w');
    const iterator = ticks.iterator();
    let counter = 0;
    let tick = iterator.next();
    while (!tick.done) {
        expect(tick.done).toBe(false);
        expect(tick.value.date.getUTCDate()).toBe(date.getUTCDate());
        date.setUTCDate(date.getUTCDate() + 7);
        tick = iterator.next();
        counter += 1;
    }

    expect(counter).toBe(11);
    expect(tick.done).toBe(true);
});

test('Ticks iterator month', () => {
    axis.max = new Date('11-01-2023').valueOf();

    const date = new Date(startDate);
    const ticks = new Ticks(axis, 'm');
    const iterator = ticks.iterator();
    let counter = 0;
    let tick = iterator.next();
    while (!tick.done) {
        expect(tick.done).toBe(false);
        expect(tick.value.date.getUTCMonth()).toBe(date.getUTCMonth());
        date.setUTCMonth(date.getUTCMonth() + 1);
        tick = iterator.next();
        counter += 1;
    }

    expect(counter).toBe(11);
    expect(tick.done).toBe(true);
});

test('Ticks iterator year', () => {
    axis.max = new Date('1-01-2024').valueOf();

    const date = new Date(startDate);
    const ticks = new Ticks(axis, 'y');
    const iterator = ticks.iterator();
    let counter = 0;
    let tick = iterator.next();
    while (!tick.done) {
        expect(tick.done).toBe(false);
        expect(tick.value.date.getUTCFullYear()).toBe(date.getUTCFullYear());
        date.setUTCFullYear(date.getUTCFullYear() + 1);
        tick = iterator.next();
        counter += 1;
    }

    expect(counter).toBe(2);
    expect(tick.done).toBe(true);
});
