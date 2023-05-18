import { axisExtrema, DAY, distance, findById, rowCount, syncLinkedItems, validateModel } from './modelOperations';
import { RowModel } from './models';

let rowModel: RowModel[];

beforeEach(() => {
    rowModel = [
        {
            id: '0',
            label: '0',
            children: [
                {
                    id: '00',
                    label: '00',
                    children: [
                        {
                            id: '000',
                            label: '000',
                            item: {
                                start: 111,
                                end: 444
                            },
                            children: []
                        },
                        {
                            id: '001',
                            label: '001',
                            item: {
                                start: 222,
                                end: 555,
                                after: '000',
                            },
                            children: [],
                        }
                    ]
                }
            ]
        },
        {
            id: '1',
            label: '1',
            item: {
                start: 999,
                end: 1000,
            },
            children: [
                {
                    id: '11',
                    label: '11',
                    item: {
                        start: 0,
                        end: 100
                    },
                    children: []
                },
                {
                    id: '12',
                    label: '12',
                    item: {
                        start: 100,
                        end: 999
                    },
                    children: []
                }
            ]
        }
    ];
});

test('find extrema from row model', () => {
    const extrema = axisExtrema(rowModel, 'd');
    expect(extrema.min).toBe(0);
    expect(extrema.max).toBe(1000);
});

test('find by id', () => {
    const row = findById(rowModel, '11');
    expect(row).toBeDefined();
    expect(row.id).toBe('11');
    expect(row.label).toBe('11');
});

test('counting [c]rows', () => {
    expect(rowCount(rowModel)).toBe(7);
});

test('syncing linked items', () => {
    syncLinkedItems({ rows: rowModel, milestones: [] });
    const row = findById(rowModel, '001');
    expect(row.item.start).toEqual(444);
    expect(row.item.end).toEqual(777);
});

test('model is valid', () => {
    rowModel[1].item.start = 1000;
    rowModel[1].item.end = 0;
    validateModel({ rows: rowModel, milestones: [] });
    expect(rowModel[1].item.start).toBe(0);
    expect(rowModel[1].item.end).toBe(DAY);
});

test('distance function', () => {
    expect(distance(1, 2, 4, 6)).toEqual(5);
});
