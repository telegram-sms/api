class Snowflake {
  private static instance: Snowflake;
  private sequence: number;
  private lastTimestamp: number;
  private readonly characters: string;

  private constructor() {
    this.sequence = 0;
    this.lastTimestamp = -1;
    this.characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  }

  public static getInstance(): Snowflake {
    if (!Snowflake.instance) {
      Snowflake.instance = new Snowflake();
    }
    return Snowflake.instance;
  }

  private currentTime(): number {
    return Date.now();
  }

  private nextTimestamp(lastTimestamp: number): number {
    let timestamp = this.currentTime();
    while (timestamp <= lastTimestamp) {
      timestamp = this.currentTime();
    }
    return timestamp;
  }

  private generateRandomCharacter(): string {
    const randomIndex = Math.floor(Math.random() * this.characters.length);
    return this.characters[randomIndex];
  }

  public generateKey(): string {
    let timestamp = this.currentTime();

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 0x1fff; // 13-bit sequence
      if (this.sequence === 0) {
        timestamp = this.nextTimestamp(this.lastTimestamp);
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;

    // Generate a 9-character key
    const key = ((timestamp & 0x1fffff) << 13) | this.sequence; // 21-bit timestamp + 13-bit sequence
    let keyString = Math.abs(key).toString(36); // Convert to base-36 string and ensure it's positive
    while (keyString.length < 9) {
      keyString += this.generateRandomCharacter();
    }
    return keyString.slice(0, 9); // Ensure the key is 9 characters
  }
}
export default Snowflake;
