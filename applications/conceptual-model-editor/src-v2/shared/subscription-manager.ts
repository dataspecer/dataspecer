
/**
 * A subscriptions manager.
 */
export class SubscriptionManager<ValueType> {

  /**
   * All active subscribers.
   */
  private subscribers: ((state: ValueType) => void)[] = [];

  /**
   * Notify listeners if there is a new value.
   */
  notifyAll(value: ValueType): void {
    this.subscribers.forEach(subscriber => subscriber(value));
  }

  /**
   * Add a new subscriber.
   */
  subscribe(subscriber: (state: ValueType) => void): () => void {
    this.subscribers.push(subscriber);
    return () => {
      this.subscribers = this.subscribers.filter((item) => item !== subscriber);
    };
  }

}
