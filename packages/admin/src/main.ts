import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './styles/feishu-theme.css';   // 飞书风格覆盖
import App from './App.vue';

const app = createApp(App);
app.use(ElementPlus);
app.mount('#app');