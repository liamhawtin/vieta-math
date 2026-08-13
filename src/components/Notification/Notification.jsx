import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import './Notification.scss';

const Notification = observer(({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (notification.isRemoving && !isRemoving) {
      setIsRemoving(true);
    }
  }, [notification.isRemoving, isRemoving]);

  const handleRemove = () => {
    setIsRemoving(true);
    // Wait for fade-out animation before removing
    setTimeout(() => {
      onRemove(notification.id);
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div
      className={`notification notification--${notification.type} ${
        isVisible && !isRemoving ? 'notification--visible' : ''
      } ${isRemoving ? 'notification--removing' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className="notification__icon">
        {getIcon()}
      </div>
      <div className="notification__content">
        <span className="notification__message">{notification.message}</span>
      </div>
      <button
        className="notification__close"
        onClick={handleRemove}
        aria-label="Close notification"
        type="button"
      >
        ×
      </button>
    </div>
  );
});

export default Notification;
