import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';


// 菜单接口
interface MenuItem {
  id: number;
  name: string;
  path: string;
  component: string;
  title: string;
  icon: string;
  orderNum: number;
  parentId: number | null;
  type: string;
  status: string;
  affixTab: boolean;
  createTime: string;
  updateTime: string | null;
}

/**
 * 获取用户所有菜单
 */
export async function getAllMenusApi() {
  return requestClient.get<RouteRecordStringComponent[]>('/Menu/GetRootMenus');
}

export async function getMenuList() {
  return requestClient.get('/Menu/GetMenus');
}

export function deleteMenu(id: number) {
  return requestClient.delete(`/Menu/DeleteMenuById?id=${id}`);
}

/**
 * 创建菜单
 * @param data 菜单数据
 */
export async function createMenu(data: Omit<MenuItem, 'children' | 'id'>) {
  return requestClient.post('/system/menu', data);
}

/**
 * 更新菜单
 * @param id 菜单ID
 * @param data 菜单数据
 */
export async function updateMenu(id: string, data: Omit<MenuItem, 'children' | 'id'>) {
  return requestClient.put(`/system/menu/${id}`, data);
}
