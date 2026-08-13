import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '@stores/StoreContext';
import Notification from './Notification';
import './NotificationContainer.scss';

const NotificationContainer = observer(() => {
  const { notificationStore } = useStores();

  if (notificationStore.notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container" role="region" aria-label="Notifications">
      {notificationStore.notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onRemove={notificationStore.removeNotification.bind(notificationStore)}
        />
      ))}
    </div>
  );
});

export default NotificationContainer;
