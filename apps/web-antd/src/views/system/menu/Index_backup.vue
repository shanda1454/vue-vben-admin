<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useVbenModal, VbenButton } from '@vben/common-ui';
import { Button } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
// @ts-ignore
import { $t } from '#/locales';
import { columns } from './data';
import { getMenuList, deleteMenu } from '#/api/core/menu';
import MenuDrawer from './MenuDrawer.vue';
// 定义行数据类型
interface RowVO {
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

// 配置表格选项
const gridOptions: VxeGridProps<RowVO> = {
  columns: columns,
  proxyConfig: {
    ajax: {
      query: async () => {
        // 默认接收 Promise<any[]>
        const res = await getMenuList();
        return {
          items: res,
          total: 100
        }
      }
    }
  },
  showOverflow: true,
  border: 'outer',
  stripe: true,
  columnConfig: {
    resizable: true
  },
  checkboxConfig: {
    labelField: 'name'
  },
  treeConfig: {
    transform: true,
    showLine: true
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

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
});

const [Modal, modalApi] = useVbenModal({
  // 连接抽离的组件
  connectedComponent: MenuDrawer,
});

function openModal() {
  modalApi.open();
}

// 处理编辑菜单
const handleEdit = (row: RowVO) => {
  
};

// 处理删除菜单
const handleDelete = async (row: RowVO) => {
  try {
    
    gridApi.reload();
  } catch (error) {
    console.error('删除菜单失败:', error);
  }
};

// 处理刷新
const handleRefresh = () => {
  gridApi.reload();
};


</script>

<template>
  <Page style="height: 80%;">
    <Grid>
      <template #toolbar-actions>
        <Button type="primary" @click="openModal">
          <IconifyIcon icon="ant-design:plus-outlined" class="mr-1" />
          {{ $t('system.create') }}
        </Button>
      </template>
      <template #action>
        <Button type="link" @click="handleEdit">{{ $t('system.edit') }}</Button>
        <Button type="link" @click="handleDelete">{{ $t('system.delete') }}</Button>
      </template>
    </Grid>
    <Modal @success="handleRefresh" />
  </Page>
</template>
