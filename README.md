
# Gantt Renderer
The Gantt Renderer draws a canvas-based gantt chart and allows for interactions and customizations.

## Installation
`npm install @dontsteponme/gantt-renderer`

## Usage
The gantt renderer expects a canvas element, width/height, data, and a definition on how to draw aspects of the chart. Once can subscribe to certain events like requests for model changes. Most of the time, it is up to the consumer to make any model changes and feed it back into the gantt renderer.

```TSX
// get canvas element
const canvas = document.createElement(canvas);
document.body.appendChild(canvas);

const itsBeen = 1000 * 60 * 60 * 24 * 7; // one week

// create Gantt
const gantt = new Gantt(canvas);
gantt.width = 500;
gantt.height = 500;
gantt.definition = {
    rowHeight: 50,
    columnWidth: 200,
    yOffset: 0,
    granularity: 'd',
} as Definition;
gantt.model = {
    milestones: [],
    rows: [
        {
            id: 'xyz123',
            label: 'Some Task',
            item: {
                label: 'Jane Doe',
                start: Date.now().valueOf(),
                end: Date.now().valueOf() + itsBeen,
                color: 'blue',
            },
            children: []
        }
    ]
} as GanttModel;
```

One can listen to changes from interaction on the gantt chart

```TSX
// listen for a click event
// @param what was clicked e.g. "item", "row", "link"
// @param where the element is located { x, y, width, height }
// @param id (optional), id of the item that was selected
gantt.on('click', (what: string, where: Rect, id?: string) => {
    switch (what) {
        case 'item':
            if (id) {
                showItemDetails(id);
            }
            break;
        default:
            showMenuPopover(where);
            break;
    }
});

// event when a particular item is being shifted in time,
// or resized
gantt.on('timeChange', (itemId: string, startDelta: number, endDelta: number) => {
    const item = findById(someModel, itemId);
    // move the start point some number of milliseconds
    item.start += startDelta;
    // move the end point some number of milliseconds
    item.end += endDelta;
});

// when an item is linked to another item
// it must be done sequentially after the depenency
gantt.on('after', (currentItemId: string, dependencyItemId: string) => {
    findById(someModel, currentItemId).dependencyOn = dependencyItemId;
    gantt.model = toGanttModel(someModel);
});
```
