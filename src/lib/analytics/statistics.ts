export const distinct = <T>(values: T[]) => new Set(values).size;
export function median(values: number[]): number | null {
	if (!values.length) return null;
	const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
export const rate = (n: number, d: number) => d ? `${Math.round(100 * n / d)}%` : 'Not available';
export function duration(seconds: number | null | undefined): string {
	if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return 'Not available';
	if (seconds < 60) return `${Math.round(seconds)}s`;
	if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
	if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
	return `${(seconds / 86400).toFixed(1)}d`;
}
