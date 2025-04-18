<script lang="ts" setup>

import { AuthPageLayout } from '@vben/layouts';

import { $t } from '#/locales';

const appName = 'Matrix Smart OS';
const logo = '/img/logo.png';
</script>

<template>
  <AuthPageLayout
    :app-name="appName"
    :logo="logo"
    :page-description="$t('authentication.pageDesc')"
    :page-title="$t('authentication.pageTitle')"
  >
    <!-- 自定义工具栏 -->
    <!-- <template #toolbar></template> -->
  </AuthPageLayout>
</template>
