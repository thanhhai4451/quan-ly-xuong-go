import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(
        registrations
          .filter((registration) =>
            [
              registration.active,
              registration.waiting,
              registration.installing,
            ].some((worker) =>
              worker?.scriptURL.endsWith('/firebase-messaging-sw.js'),
            ),
          )
          .map((registration) => registration.unregister()),
      ),
    )
    .catch((error) => {
      console.error('Không thể gỡ Firebase Messaging service worker:', error);
    });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
