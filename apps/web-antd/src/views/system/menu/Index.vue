<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useVbenModal, confirm, alert } from '@vben/common-ui';
import { Button, Result } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
// @ts-ignore
import { $t } from '#/locales';
import { columns } from './data';
import { getMenuList, deleteMenu, type MenuItem } from '#/api/core/menu';
import MenuDrawer from './MenuDrawer.vue';
import { h, ref, nextTick } from 'vue';

// 定义行数据类型
interface RowVO extends MenuItem {
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

// 存储菜单列表数据
const menuListData = ref<MenuItem[]>([]);
// 存储表格展开状态
const isExpanded = ref<boolean>(false);

// 配置表格选项
const gridOptions: VxeGridProps<RowVO> = {
  columns: columns,
  proxyConfig: {
    ajax: {
      query: async () => {
        // 默认接收 Promise<any[]>
        const res = await getMenuList();
        // 保存菜单数据供树形选择器使用
        menuListData.value = res;
        return {
          items: res,
          total: 100
        }
      }
    }
  },
  showOverflow: true,
  border: 'none',
  stripe: true,
  columnConfig: {
    resizable: true
  },
  checkboxConfig: {
    labelField: 'name'
  },
  treeConfig: {
    transform: true,
    showLine: true,
    accordion: false
  },
  height: '100%',
  keepSource: true,
  pagerConfig: {
    enabled: false,
  },
  
  rowConfig: {
    keyField: 'id',
    useKey: true
  },
  toolbarConfig: {
    custom: true,
    export: false,
    refresh: { code: 'query' },
    zoom: true,
  }
};

// 表格
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
});

// 模态框
const [Modal, modalApi] = useVbenModal({
  // 连接抽离的组件
  connectedComponent: MenuDrawer,
  onOpenChange(isOpen) {
    // console.log('Modal open state:', isOpen);
  },
  onConfirm() {
    handleRefresh();
  }
});

function openModal() {
  // 设置为新增模式
  modalApi.setState({ title: $t('system.create') });
  // 清空数据并设置默认值为无父级菜单(0)
  modalApi.setData({ parentId: 0 });
  modalApi.open();
}

// 处理添加子菜单
const handleAdd = (row: RowVO) => {
  // 设置为新增模式
  modalApi.setState({ title: $t('system.create') });
  // 设置当前行作为父级菜单
  modalApi.setData({ parentId: row.id });
  // 打开模态框
  modalApi.open();
};

// 处理编辑菜单
const handleEdit = (row: RowVO) => {
  // 先设置标题
  modalApi.setState({ title: $t('system.edit') });
  // 再设置数据并打开模态框
  modalApi.setData({...row});
  // 打开模态框
  modalApi.open();
};

// 处理删除菜单
const handleDelete = async (row: RowVO) => {
  try {
    await confirm({
      title: $t('system.delete'),
      content: $t('system.deleteConfirm', { name: row.title }),
      icon: 'warning',
    });

    // 用户点击确认后执行删除
    await deleteMenu(row.id);
    alert('删除成功!');
    handleRefresh();
  } catch (error) {
    // 忽略取消操作的错误
    if (error instanceof Error && error.message !== 'dialog cancelled') {
      console.error('删除失败:', error);
      alert('删除失败!');
    }
  }
};

// 处理展开全部
const handleExpandAll = () => {
  isExpanded.value = true;
  if (gridApi.grid) {
    gridApi.grid.setAllTreeExpand(true);
  }
};

// 处理折叠全部
const handleCollapseAll = () => {
  isExpanded.value = false;
  if (gridApi.grid) {
    gridApi.grid.setAllTreeExpand(false);
  }
};

// 处理刷新
const handleRefresh = () => {
  const expanded = isExpanded.value;
  gridApi.reload().then(() => {
    // 恢复展开状态
    if (expanded) {
      setTimeout(() => {
        handleExpandAll();
      }, 100);
    }
  });
};

</script>

<template>
  <div class="p-5" style="height: 99%;">
    <Grid>
      <template #toolbar-actions>
        <Button type="primary" @click="openModal">
          <IconifyIcon icon="ant-design:plus-outlined" class="mr-1" />
          {{ $t('system.create') }}
        </Button>
        <Button class="ml-2" @click="handleExpandAll">
          <IconifyIcon icon="ant-design:node-expand-outlined" class="mr-1" />
          展开全部
        </Button>
        <Button class="ml-2" @click="handleCollapseAll">
          <IconifyIcon icon="ant-design:node-collapse-outlined" class="mr-1" />
          折叠全部
        </Button>
      </template>
      <template #action="{ row }">
        <Button type="link" @click="() => handleAdd(row)">{{ $t('system.add') }}</Button>
        <Button type="link" @click="() => handleEdit(row)">{{ $t('system.edit') }}</Button>
        <Button type="link" @click="() => handleDelete(row)">{{ $t('system.delete') }}</Button>
      </template>
    </Grid>
    <Modal @success="handleRefresh" :menuList="menuListData" />
  </div>
</template>
