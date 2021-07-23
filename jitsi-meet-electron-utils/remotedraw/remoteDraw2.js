import React from "react";
import ReactDOM from "react-dom";
// import "./index.css";
// import "bootstrap/dist/css/bootstrap.min.css";
import App from "./Draw";
import { ipcRenderer } from "electron";

window.onload = () => {
  console.log("this thing ");
  ReactDOM.render(<App />, document.getElementById("root"));
};