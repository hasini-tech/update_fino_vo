import React, { useState } from "react";
import { sendTestNotification } from "../services/settingsService";

const NotificationSettings = () => {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const handleTestClick = async (type) => {
    try {
      const response = await sendTestNotification(type);
      alert(response.message);
    } catch (error) {
      alert(`Failed to send test ${type} notification: ${error.message}`);
    }
  };

  return (
    <div className="settings-container">
      <h2>Notification Settings</h2>
      <p>Control how and when you receive notifications</p>

      <div className="notification-section">
        <h3>General Notifications</h3>
        <p>Basic account and system notifications</p>

        {/* Email Notifications */}
        <div className="notification-item">
          <label>Email Notifications</label>
          <p>Receive important updates via email</p>
          <button onClick={() => handleTestClick("email")}>Test</button>
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(e) => setEmailEnabled(e.target.checked)}
          />
        </div>

        {/* Push Notifications */}
        <div className="notification-item">
          <label>Push Notifications</label>
          <p>Get real-time alerts on your device</p>
          <button onClick={() => handleTestClick("push")}>Test</button>
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={(e) => setPushEnabled(e.target.checked)}
          />
        </div>

        {/* SMS Notifications */}
        <div className="notification-item">
          <label>SMS Notifications</label>
          <p>Text message alerts for critical updates</p>
          <button onClick={() => handleTestClick("sms")}>Test</button>
          <input
            type="checkbox"
            checked={smsEnabled}
            onChange={(e) => setSmsEnabled(e.target.checked)}
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
