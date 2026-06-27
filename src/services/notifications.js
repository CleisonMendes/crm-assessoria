// Simula notificações do Windows (eletron ou browser)
export const windowsNotification = {
  show: ({ title, body, icon }) => {
    // Se estiver rodando no Electron
    if (window.electronAPI) {
      window.electronAPI.sendNotification({
        title,
        body,
        icon: icon || '📊'
      });
      return;
    }

    // Fallback: Notification API do browser
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '📊'
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: icon || '📊'
          });
        }
      });
    }
  }
};