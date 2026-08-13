import { makeAutoObservable } from 'mobx';

export class NotificationStore {
  notifications = [];
  nextId = 1;

  constructor(rootStore) {
    makeAutoObservable(this, {
      rootStore: false
    });
    this.rootStore = rootStore;
  }

  showNotification(message, type = 'info', duration = 3000) {
    const id = this.nextId++;
    const notification = { id, message, type, duration };
    this.notifications.push(notification);

    if (duration > 0) {
      setTimeout(() => this.removeNotification(id), duration);
    }

    return id;
  }

  removeNotification(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  clearAll() {
    this.notifications = [];
  }

  // === Convenience methods ===
  showSuccess(message, duration = 3000) {
    return this.showNotification(message, 'success', duration);
  }
  showError(message, duration = 5000) {
    return this.showNotification(message, 'error', duration);
  }
  showWarning(message, duration = 4000) {
    return this.showNotification(message, 'warning', duration);
  }
  showInfo(message, duration = 3000) {
    return this.showNotification(message, 'info', duration);
  }
}
