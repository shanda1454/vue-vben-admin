import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';
import { useAccessStore, useUserStore } from '@vben/stores';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  // const accessStore = useAccessStore();
  // const userStore = useUserStore();
  // // 重置所有状态
  // accessStore.$reset();
  // userStore.$reset();
  
  // // 清除持久化存储
  // localStorage.clear();
  // sessionStorage.clear();
  return requestClient.get<UserInfo>('/UserInfo/GetViewById');
}
