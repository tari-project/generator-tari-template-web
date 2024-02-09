import React from "react";
import ReactDOM from "react-dom/client";
import "./theme/theme.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import ErrorPage from "./routes/ErrorPage";

const router = createBrowserRouter([
  {
    path: "*",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      // {
      //   path: "connections",
      //   element: <Connections />,
      // },
      // {
      //   path: "monitored_substates",
      //   element: <MonitoredSubstates />,
      // },
      // {
      //   path: "nfts",
      //   element: <MonitoredNftCollections />,
      // },
      // {
      //   path: "transactions",
      //   element: <RecentTransactions />,
      // },
      {
        path: "app",
        element: <App />,
      },
    ],
  },
]);

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
