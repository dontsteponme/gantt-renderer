import { Axis } from './axis';
import { DAY } from './modelOperations';
import { Ticks } from './ticks';

const startDate = '2023-01-01';
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
        expect(tick.value.date.getDate()).toBe(date.getDate());
        date.setDate(date.getDate() + 1);
        tick = iterator.next();
        counter += 1;
    }

    expect(counter).toBe(11);
    expect(tick.done).toBe(true);
});

test('Ticks iterator week', () => {
    axis.max = axis.min + DAY * 7 * 10;

    const date = new Date(startDate);
    date.setUTCHours(0, date.getTimezoneOffset(), 0, 0);
    const ticks = new Ticks(axis, 'w');
    const iterator = ticks.iterator();
    let counter = 0;
    let tick = iterator.next();
    while (!tick.done) {
        expect(tick.done).toBe(false);
        expect(tick.value.date.getDate()).toBe(date.getDate());
        date.setDate(date.getDate() + 7);
        tick = iterator.next();
        counter += 1;
    }

    expect(counter).toBe(10);
    expect(tick.done).toBe(true);
});

test('Ticks iterator month', () => {
    axis.max = new Date('2023-11-01').valueOf();
    const date = new Date(startDate);
    date.setUTCHours(0, date.getTimezoneOffset(), 0, 0);
    const ticks = new Ticks(axis, 'm');
    const iterator = ticks.iterator();
    let counter = 0;
    let tick = iterator.next();
    while (!tick.done) {
        expect(tick.done).toBe(false);
        expect(tick.value.date.getMonth()).toBe(date.getMonth());
        date.setMonth(date.getMonth() + 1);
        tick = iterator.next();
        counter += 1;
    }

    expect(tick.done).toBe(true);
});

test('Ticks iterator year', () => {
    axis.max = new Date('2024-01-01').valueOf();

    const date = new Date(startDate);
    const ticks = new Ticks(axis, 'y');
    const iterator = ticks.iterator();
    let counter = 0;
    let tick = iterator.next();
    while (!tick.done) {
        expect(tick.done).toBe(false);
        expect(tick.value.date.getFullYear()).toBe(date.getFullYear());
        date.setFullYear(date.getFullYear() + 1);
        tick = iterator.next();
        counter += 1;
    }

    expect(counter).toBe(2);
    expect(tick.done).toBe(true);
});
