import { createApp } from "vue";
import { createPinia } from "pinia";
import SiteRoot from "./site/SiteRoot.vue";
import { startSiteSettings } from "./site/settings";
import "./style.css";
import "./site/site.css";

startSiteSettings();
createApp(SiteRoot).use(createPinia()).mount("#app");
