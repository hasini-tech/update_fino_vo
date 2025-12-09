import React from "react";
import ReactDOM from "react-dom/client";
// REMOVE: import { ChakraProvider } from '@chakra-ui/react'; 
import App from "./App";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {/* CRITICAL: Ensure <App /> is NOT wrapped in <ChakraProvider> */}
    <App /> 
  </React.StrictMode>
);