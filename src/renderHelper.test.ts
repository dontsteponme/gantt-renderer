import { collides } from './renderHelper';

test('detect collision', () => {
    const testRect = {
        x: 0,
        y: 0,
        width: 10,
        height: 10
    };
    const overlapsLeft = {
        x: -10,
        y: 5,
        width: 15,
        height: 1
    };
    const overlapsRight = {
        x: 5,
        y: 5,
        width: 15,
        height: 1
    };
    const overlapsTop = {
        x: 5,
        y: -10,
        width: 1,
        height: 15
    };
    const overlapsBottom = {
        x: 1,
        y: 5,
        width: 15,
        height: 10
    };
    const within = {
        x: 4,
        y: 4,
        width: 1,
        height: 1
    };

    expect(collides(testRect, overlapsLeft)).toBe(true);
    expect(collides(testRect, overlapsRight)).toBe(true);
    expect(collides(testRect, overlapsTop)).toBe(true);
    expect(collides(testRect, overlapsBottom)).toBe(true);
    expect(collides(testRect, within)).toBe(true);
});

test('detect miss', () => {
    const testRect = {
        x: 0,
        y: 0,
        width: 10,
        height: 10
    };
    const left = {
        x: -10,
        y: 5,
        width: 9,
        height: 1
    };
    const right = {
        x: 5,
        y: 15,
        width: 15,
        height: 1
    };
    const above = {
        x: 5,
        y: -10,
        width: 1,
        height: 1
    };
    const below = {
        x: 1,
        y: 15,
        width: 15,
        height: 10
    };

    expect(collides(testRect, left)).toBe(false);
    expect(collides(testRect, right)).toBe(false);
    expect(collides(testRect, above)).toBe(false);
    expect(collides(testRect, below)).toBe(false);
});
