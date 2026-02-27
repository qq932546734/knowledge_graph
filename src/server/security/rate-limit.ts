interface LimitRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private records = new Map<string, LimitRecord>();

  constructor(
    private readonly windowMs: number,
    private readonly maxAttempts: number,
  ) {}

  canAttempt(key: string): boolean {
    const now = Date.now();
    const record = this.records.get(key);

    if (!record) {
      return true;
    }

    const timestamps = record.timestamps.filter((timestamp) => now - timestamp < this.windowMs);
    record.timestamps = timestamps;
    this.records.set(key, record);

    return timestamps.length < this.maxAttempts;
  }

  recordFailure(key: string): void {
    const now = Date.now();
    const record = this.records.get(key) ?? { timestamps: [] };

    record.timestamps = [...record.timestamps, now].filter(
      (timestamp) => now - timestamp < this.windowMs,
    );

    this.records.set(key, record);
  }

  reset(key: string): void {
    this.records.delete(key);
  }
}
