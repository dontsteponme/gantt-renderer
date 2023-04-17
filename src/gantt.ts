import { Axis } from "./axis";
import { EventEmitter } from "./eventEmitter";
import { InteractionManager } from "./interactionManager";
import { axisExtrema, DAY, findById, rowCount, syncLinkedItems } from "./modelOperations";
import { Definition, GanttModel, PeriodType } from "./models";
import { renderView, ViewRect } from "./renderHelper";
import { elementInView, IElementWithParent, interactiveElementInView, offsetRect, viewModelFromModel } from "./viewModel";

export class Gantt extends EventEmitter {

    private _width: number = 0;
    public get width(): number {
        return this._width;
    }
    public set width(v: number) {
        if (v !== this._width) {
            this.invalidate('size');
            this._width = v;
        }
    }

    private _height: number = 0;
    public get height(): number {
        return this._height;
    }
    public set height(v: number) {
        if (v !== this._height) {
            this._height = v;
            this.invalidate('size');
        }
    }

    private _model: GanttModel | undefined;
    public get model(): GanttModel | undefined {
        return this._model;
    }
    public set model(v: GanttModel | undefined) {
        if (this._model && this.model.rows.length === 0) {
            this._axis = null; // rebuild
        }

        this._model = v;
        this.invalidate('model');
    }

    private _definition: Definition | undefined;
    public get definition(): Definition | undefined {
        return this._definition;
    }
    public set definition(v: Definition | undefined) {
        this._definition = v;
        this.invalidate('definition');
    }

    private _axis: Axis | undefined;
    public get axis(): Axis {
        if (!this._axis) {
            const granularity = this._definition?.granularity ?? 'd';
            let { min, max } = axisExtrema(this._model?.rows ?? [], granularity);
            if (this._definition.axis) {
                min = this._definition.axis.start;
                max = this._definition.axis.end;
            } else {
                if (min === Number.MAX_SAFE_INTEGER) {
                    const today = new Date();
                    today.setUTCHours(0, today.getTimezoneOffset(), 0, 0);
                    min = today.valueOf();
                    max = min + DAY;
                }
            }
            let padding: number = DAY;
            switch (granularity) {
                case 'd':
                    padding *= 2;
                    break;
                case 'w':
                    padding *= 7;
                    break;
                case 'm':
                default:
                    padding *= 30;
                    break;
            }
            min -= padding;
            max += padding;

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

    public get canvas(): HTMLCanvasElement {
        return this._canvas;
    }
    public set canvas(v: HTMLCanvasElement) {
        if (v) {
            this._canvas = v;
            this.ctx = v.getContext('2d');
        }
    }

    public ctx: CanvasRenderingContext2D | null;

    private _invalidateId: number | undefined;
    private _invalidProperties: string[] = [];

    private _interactionManager: InteractionManager = new InteractionManager();
    private _viewModel: ViewRect | undefined;

    private _linking: {
        x0: number,
        x1: number,
        y0: number,
        y1: number,
        id: string,
    };

    constructor(private _canvas: HTMLCanvasElement) {
        super();
        this.ctx = _canvas.getContext('2d');

        this._interactionManager.addEventListeners();
        this._interactionManager.on('click', (x: number, y: number) => {
            const hit = interactiveElementInView({ x: x, y: y, width: 1, height: 1 }, this._viewModel);
            if (hit?.element.className) {
                switch (hit.element.className) {
                    case 'circleLeft':
                        const id = this._idFromParent(hit.parent);
                        const m = findById(this._model.rows, id);
                        if (m?.item?.after) {
                            this.trigger('click', 'link', offsetRect(hit), id);
                            break;
                        }
                    case 'circleRight':
                    case 'handle':
                    case 'item':
                        this.trigger('click', 'item', offsetRect(hit), this._idFromParent(hit.parent));
                        break;
                    case 'canvas':
                    case 'row':
                    default:
                        this.trigger('click', hit.element.className, offsetRect(hit));
                        break;
                }
            }

        });

        let dragId: string;
        let resizing: boolean = false;
        this._interactionManager.on('drag', (x: number, y: number, deltaX: number) => {
            if (this._linking) {
                this._linking.x1 = x;
                this._linking.y1 = y;
                this.invalidate();
                return;
            }
            if (!dragId) {
                const hit = interactiveElementInView({ x: x, y: y, width: 1, height: 1 }, this._viewModel);
                if (hit) {
                    if (hit.element.className === 'circleLeft') {
                        this._linking = {
                            x0: x,
                            y0: y,
                            x1: x,
                            y1: y,
                            id: this._idFromParent(hit.parent)
                        };
                    } else {
                        resizing = 'handle' === hit.element.className;
                        dragId = this._idFromParent(resizing ? hit.parent.parent.parent : hit?.parent) ?? '';
                    }
                }
            }
            if (dragId) {
                const value = (this._axis?.toValue(deltaX) ?? 0) - (this._axis?.min ?? 0);
                this.trigger('timeChange', dragId, resizing ? 0 : value, value);
            }
        });

        this._interactionManager.on('dragend', () => {
            dragId = null;
            resizing = false;
            if (this._linking) {
                const hit = elementInView({ x: this._linking.x1, y: this._linking.y1, width: 1, height: 1 }, this._viewModel);
                if ('item' === hit.element.className) {
                    const id = this._idFromParent(hit.parent);
                    const row = findById(this._model.rows, this._linking.id);
                    if (row?.item) {
                        row.item.after = id;
                        this.trigger('after', row.id, id);
                    }
                }
                this._linking = null;
            }
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
                case 'definition':
                    if (this._definition.axis && this._axis) {
                        this._axis.min = this._definition.axis.start;
                        this._axis.max = this._definition.axis.end;
                    }
                    break;
                default:
                    break;
            }
        }

        syncLinkedItems(this._model);
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
        if (this._linking) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.moveTo(this._linking.x0, this._linking.y0);
            this.ctx.lineTo(this._linking.x1, this._linking.y1);
            this.ctx.stroke();
        }
    }

    private _onSizeChange(): void {
        this._canvas.width = this._width * devicePixelRatio;
        this._canvas.height = this._height * devicePixelRatio;
        this._canvas.style.width = `${this._width}px`;
        this._canvas.style.height = `${this._height}px`;
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    public destroy(): void {
        this._canvas = null;
        this.ctx = null;
        this._interactionManager.destroy();
    }

    private _idFromParent(parent: IElementWithParent): string | undefined {
        let id: string | undefined;
        while (!id && parent) {
            id = parent.element?.id;
            parent = parent.parent;
        }
        return id;
    }
}
