/**
 * Axis provides a linear axis implementation for numeric values
 */
export class Axis {
    // extrema
    public min: number = 0;
    public max: number = 0;

    // pixel width
    public range: number = 0;

    // takes a value and returns a number in pixels
    public toPoint(value: number): number {
        const valueRange = this.max - this.min;
        if (valueRange > 0) {
            return Math.floor(this.range / valueRange * (value - this.min));
        } else {
            return 0;
        }
    }

    // takes a give pixel and returns a value representation
    public toValue(px: number): number {
        const valueRange = this.max - this.min;
        return px * valueRange / this.range + this.min;
    }
}
