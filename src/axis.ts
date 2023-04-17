export class Axis {
    public min: number = 0;
    public max: number = 0;

    public range: number = 0;

    public toPoint(value: number): number {
        const valueRange = this.max - this.min;
        if (valueRange > 0) {
            return Math.floor(this.range / valueRange * (value - this.min));
        } else {
            return 0;
        }
    }

    public toValue(px: number): number {
        const valueRange = this.max - this.min;
        return px * valueRange / this.range + this.min;
    }
}
