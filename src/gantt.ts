import { Axis } from "./axis";
import { EventEmitter } from "./eventEmitter";
import { InteractionManager } from "./interactionManager";
import { axisExtrema, DAY, findById, rowCount } from "./modelOperations";
import { Definition, GanttModel, PeriodType, RowModel } from "./models";
import { renderView, Shape, ViewRect } from "./renderHelper";
import { elementInView, viewModelFromModel } from "./viewModel";

export class Gantt extends EventEmitter {

    private _width: number;
    public get width(): number {
        return this._width;
    }
    public set width(v: number) {
        if (v !== this._width) {
            this.invalidate('size');
            this._width = v;
        }
    }

    private _height: number;
    public get height(): number {
        return this._height;
    }
    public set height(v: number) {
        if (v !== this._height) {
            this._height = v;
            this.invalidate('size');
        }
    }

    private _model: GanttModel;
    public get model(): GanttModel {
        return this._model;
    }
    public set model(v: GanttModel) {
        this._model = v;
        this.invalidate('model');
    }


    private _definition: Definition;
    public get definition(): Definition {
        return this._definition;
    }
    public set definition(v: Definition) {
        this._definition = v;
        this.invalidate('definition');
    }

    private _axis: Axis;
    public get axis(): Axis {
        if (!this._axis) {
            let { min, max } = axisExtrema(this._model.rows, this._definition.granularity);
            if (min === 0) {
                min = new Date().valueOf() - DAY;
                max = min + DAY * 7;
            }
            const axis = this._axis = new Axis();
            axis.min = min;
            axis.max = max;
            axis.range = this._width;
        }
        return this._axis;
    }

    private get granularity(): PeriodType {
        const axisRange = this.axis.max - this.axis.min;
        const days = axisRange / DAY;
        return days < 160 ? (days < 30 ? 'd' : 'w') : (days < 730 ? 'm' : 'y');
    }


    public ctx: CanvasRenderingContext2D;

    private _invalidateId: number;
    private _invalidProperties: string[] = [];

    private _interactionManager: InteractionManager = new InteractionManager();
    private _viewModel: ViewRect;

    constructor(public canvas: HTMLCanvasElement) {
        super();
        this.ctx = canvas.getContext('2d');

        this._interactionManager.addEventListeners();
        this._interactionManager.on('click', (x: number, y: number) => {
            const hit = elementInView({ x: x, y: y, width: 1, height: 1 }, this._viewModel);
            if (hit.element.id) {
                console.log(`row ${hit.element.id} clicked`);
            } else if (hit.parent.element.id) {
                console.log(`item ${hit.parent.element.id} clicked`);
            } else if ((hit.element as ViewRect).children?.some(v => Boolean(v.id))) {
                console.log('new item');
            }
        });

        let dragId: string;
        let resizing: boolean = false;
        this._interactionManager.on('drag', (x: number, y: number, deltaX: number) => {
            if (!dragId) {
                const hit = elementInView({ x: x, y: y, width: 1, height: 1 }, this._viewModel);
                resizing = 'handle' === hit.element.id;
                dragId = resizing ? hit.parent.parent.element.id : hit.parent.element.id;
            }
            if (dragId) {
                const value = this._axis.toValue(deltaX) - this._axis.min;
                this.trigger('timeChange', dragId, resizing ? 0 : value, value);
            }
        });
        this._interactionManager.on('dragend', () => {
            dragId = null;
            resizing = false;
        });

        this._interactionManager.on('zoom', (delta: number) => {
            const zoom = Math.floor(delta * DAY);
            const valueRange = this._axis.max - this._axis.min;
            if ((zoom < 0 && valueRange > DAY * 7) ||
                (zoom > 0 && valueRange < DAY * 365)) {
                this._axis.min -= zoom;
                this._axis.max += zoom;
                this.invalidate();
            }
        });
        this._interactionManager.on('scroll', (deltaX: number, deltaY: number) => {
            if (deltaX) {
                let offsetX: number = deltaX;
                switch (this.granularity) {
                    case 'd':
                        offsetX *= 1000 * 60 * 60;
                        break;
                    case 'w':
                        offsetX *= 1000 * 60 * 60;
                        break;
                    case 'm':
                    case 'y':
                    default:
                        offsetX *= 1000 * 60 * 60 * 12;
                        break;
                }
                this._axis.min += offsetX;
                this._axis.max += offsetX;
                this.invalidate()
            }
            if (deltaY) {
                // TODO: This should come from the parent
                const count = rowCount(this._model.rows);
                const contentHeight: number = count * this.definition.rowHeight;
                if (contentHeight > this._height) {
                    let offset = this._definition.yOffset;
                    offset -= deltaY;
                    offset = Math.max(Math.min(0, offset), -contentHeight + this._height);
                    this._definition.yOffset = offset;
                    this.invalidate();
                }
            }
        });
    }

    public invalidate(...properties: string[]): void {
        this._invalidProperties = this._invalidProperties.concat(properties);
        if (!this._invalidateId) {
            this._invalidateId = window.requestAnimationFrame(() => {
                this.validate();
                this._invalidateId = null;
            });
        }
    }

    public validate(): void {
        const len = this._invalidProperties.length;
        for (let i = 0; i < len; i++) {
            const prop = this._invalidProperties[i];
            switch (prop) {
                case 'size':
                    this._onSizeChange();
                    break;
                default:
                    break;
            }
        }

        const viewPort = {
            x: 0,
            y: 0,
            width: this._width,
            height: this._height
        };
        this.ctx.clearRect(viewPort.x, viewPort.y, viewPort.width, viewPort.height);
        this._definition.granularity = this.granularity;
        this._viewModel = viewModelFromModel(this._model, this._definition, this.axis, viewPort, this.ctx);
        renderView(this._viewModel, this.ctx);
        this._invalidProperties.length = 0;
    }

    private _onSizeChange(): void {
        this.canvas.width = this._width * devicePixelRatio;
        this.canvas.height = this._height * devicePixelRatio;
        this.canvas.style.width = `${this._width}px`;
        this.canvas.style.height = `${this._height}px`;
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
    }
}
