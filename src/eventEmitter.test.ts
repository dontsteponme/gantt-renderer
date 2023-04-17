import { EventEmitter } from "./eventEmitter";

let eventEmitter: EventEmitter;

beforeEach(() => {
    eventEmitter = new EventEmitter();
});

afterEach(() => {
    eventEmitter.destroy();
    eventEmitter = null;
});

test('Event Emitter listens to an event', done => {
    const triggerValue = 2;
    eventEmitter.on('fakeEvent', (v) => {
        expect(v).toBe(triggerValue);
        done();
    });

    eventEmitter.trigger('fakeEvent', triggerValue);
});

test('Event Emitter handles multiple parameters', done => {
    eventEmitter.on('fakeEvent', (p0: number, p1: number, p2: number, p3: number) => {
        expect(p0).toBe(0);
        expect(p1).toBe(1);
        expect(p2).toBe(2);
        expect(p3).toBe(3);
        done();
    });

    eventEmitter.trigger('fakeEvent', 0, 1, 2, 3);
});

test('Event Emitter should remove listener of event and callback', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    eventEmitter.on('foo', callback1);
    eventEmitter.on('foo', callback2);
    eventEmitter.off('foo', callback1);
    eventEmitter.trigger('foo');
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
});

test('Event Emitter should remove listener of event', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    eventEmitter.on('foo', callback1);
    eventEmitter.on('foo', callback2);
    eventEmitter.off('foo');
    eventEmitter.trigger('foo');
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
});

test('Event Emitter should remove all listeners', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    eventEmitter.on('foo', callback1);
    eventEmitter.on('bar', callback2);
    eventEmitter.off();
    eventEmitter.trigger('foo');
    eventEmitter.trigger('bar');
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
});
