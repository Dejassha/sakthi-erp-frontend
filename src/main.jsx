import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { App as AntdApp, message } from "antd";
import App from "./App.jsx";
import GlobalErrorBoundary from "./components/ReusableComponents/GlobalErrorBoundary.jsx";
import { AuthProvider } from "./context/AuthProvider.jsx";
import { store } from "./store/store.js";
import "./index.css";

// Configure Ant Design global message settings
message.config({
  maxCount: 1,
  duration: 3,
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <Provider store={store}>
        <AntdApp>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AntdApp>
      </Provider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
