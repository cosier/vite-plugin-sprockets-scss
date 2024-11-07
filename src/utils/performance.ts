export class PerformanceMonitor {
    private startTime: number = 0;
    private marks: Map<string, number> = new Map();

    start(): void {
        this.startTime = performance.now();
    }

    mark(label: string): void {
        this.marks.set(label, performance.now());
    }

    getDuration(label?: string): number {
        if (label) {
            const mark = this.marks.get(label);
            return mark ? mark - this.startTime : 0;
        }
        return performance.now() - this.startTime;
    }

    getMarks(): Map<string, number> {
        return new Map(this.marks);
    }

    reset(): void {
        this.startTime = 0;
        this.marks.clear();
    }
}
