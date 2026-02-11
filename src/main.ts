import { createApp } from "vue";
import { MotionPlugin } from "@vueuse/motion";
import App from "./App.vue";
import { createPinia } from "pinia";
import router from "./router";
import { initMiniPlayerBridge } from "./ipc/miniPlayerBridge";

import "./style.css";

import "./demos/ipc";
// If you want use Node.js, the`nodeIntegration` needs to be enabled in the Main process.
// import './demos/node'

const pinia = createPinia();
const app = createApp(App);
app.use(MotionPlugin);
app.use(pinia);
app.use(router);
initMiniPlayerBridge(pinia);
app.mount("#app").$nextTick(() => {
	postMessage({ payload: "removeLoading" }, "*");
});
