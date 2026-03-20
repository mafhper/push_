export type NotificationType = 'ci_failure' | 'security_alert' | 'rate_limit';

class NotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    
    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  get isEnabled(): boolean {
    return this.permission === 'granted';
  }

  notify(title: string, options?: NotificationOptions) {
    if (this.permission !== 'granted') return;

    const defaultOptions: NotificationOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      silent: false,
    };

    try {
      new Notification(title, { ...defaultOptions, ...options });
    } catch (e) {
      console.error('Failed to send notification:', e);
    }
  }

  notifyCIFailure(repoName: string, workflowName: string) {
    this.notify(`Build Failure: ${repoName}`, {
      body: `Workflow "${workflowName}" failed. Check it now.`,
      tag: `ci-fail-${repoName}`,
    });
  }

  notifySecurityAlert(repoName: string, severity: string) {
    this.notify(`Security Alert: ${repoName}`, {
      body: `New ${severity} vulnerability detected by Dependabot.`,
      tag: `sec-alert-${repoName}`,
    });
  }
}

export const notifications = new NotificationService();
