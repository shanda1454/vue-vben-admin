import { createApp, watchEffect } from 'vue';

import { registerAccessDirective } from '@vben/access';
import { registerLoadingDirective } from '@vben/common-ui/es/loading';
import { preferences } from '@vben/preferences';
import { initStores } from '@vben/stores';
import '@vben/styles';
import '@vben/styles/antd';

// 导入Ant Design Vue 及其图标
// eslint-disable-next-line n/no-extraneous-import
import * as AntdIcons from '@ant-design/icons-vue';
import { useTitle } from '@vueuse/core';
import Antd from 'ant-design-vue';

import { $t, setupI18n } from '#/locales';

import { initComponentAdapter } from './adapter/component';
// @ts-ignore - Vue文件导入类型问题，app.vue是有效的Vue组件
import App from './app.vue';
import { router } from './router';

async function bootstrap(namespace: string) {
  // 初始化组件适配器
  await initComponentAdapter();

  // 设置弹窗的默认配置
  // setDefaultModalProps({
  //   fullscreenButton: false,
  // });

  // 设置抽屉的默认配置
  // setDefaultDrawerProps({
  //   zIndex: 1020,
  // });

  const app = createApp(App);

  // 注册所有Ant Design图标组件
  Object.keys(AntdIcons).forEach((key) => {
    app.component(key, (AntdIcons as Record<string, any>)[key]);
  });

  // 全局注册Ant Design Vue组件
  app.use(Antd);

  // 注册v-loading指令
  registerLoadingDirective(app, {
    loading: 'loading', // 在这里可以自定义指令名称，也可以明确提供false表示不注册这个指令
    spinning: 'spinning',
  });

  // 国际化 i18n 配置
  await setupI18n(app);

  // 配置 pinia-tore
  await initStores(app, { namespace });

  // 安装权限指令
  registerAccessDirective(app);

  // 初始化 tippy
  const { initTippy } = await import('@vben/common-ui/es/tippy');
  initTippy(app);

  // 配置路由及路由守卫
  app.use(router);

  // 配置Motion插件
  const { MotionPlugin } = await import('@vben/plugins/motion');
  app.use(MotionPlugin);

  // 动态更新标题
  watchEffect(() => {
    if (preferences.app.dynamicTitle) {
      const routeTitle = router.currentRoute.value.meta?.title;
      const pageTitle =
        (routeTitle ? `${$t(routeTitle)} - ` : '') + preferences.app.name;
      useTitle(pageTitle);
    }
  });

  app.mount('#app');
}

export { bootstrap };
