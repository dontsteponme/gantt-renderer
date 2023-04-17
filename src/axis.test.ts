import { Axis } from './axis';

let axis: Axis;
beforeEach(() => {
    axis = new Axis();
    axis.min = 0;
    axis.max = 1;
    axis.range = 100;
});

afterAll(() => {
    axis = null;
});

test('Axis to point', () => {
    expect(axis.toPoint(0.5)).toBe(50);
});

test ('Axis to value', () => {
    expect(axis.toValue(75)).toBe(0.75);
});
