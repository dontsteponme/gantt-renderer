import { Gantt } from "./gantt";
import { findById } from "./modelOperations";
import { GanttModel } from "./models";

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const gantt = new Gantt(canvas);
gantt.width = window.innerWidth;
gantt.height = window.outerHeight;
document.body.style.padding = '0';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const model: GanttModel = {
    milestones: [],
    rows: [
        {
            label: 'Parent0',
            id: '0',
            children: [
                {
                    label: 'Child00',
                    id: '00',
                    item: {
                        start: 1680773395911,
                        end: 1683477684405,
                    },
                    children: [
                        {
                            label: 'Child000',
                            id: '000',
                            item: {
                                start: 1680773295911,
                                end: 1683479084405,
                            },
                            children: []
                        }
                    ]
                },
                {
                    label: 'Child01',
                    id: '01',
                    item: {
                        start: 1679076028441,
                        end: 1680127129115,
                    },
                    children: []
                },
            ]
        },
        {
            label: 'Parent1',
            id: '1',
            children: [{
                label: 'Child10',
                id: '10',
                item: {
                    start: 1680997208488,
                    end: 1683605183299,
                },
                children: []
            }]
        }
    ]
};

gantt.model = model;
gantt.definition = {
    rowHeight: 40,
    yOffset: 0,
    granularity: 'd',
};

gantt.on('timeChange', (id: string, startDelta: number, endDelta: number) => {
    const rowModel = findById(model.rows, id);
    if (rowModel?.item) {
        rowModel.item.start += startDelta;
        rowModel.item.end += endDelta;
        gantt.model = model;
    }
});
