<script lang="ts" setup>
import type { VxeGridProps } from '#/adapter/vxe-table';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useVbenModal, confirm, alert } from '@vben/common-ui';
import { Button, Result, Input } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
// @ts-ignore
import { $t } from '#/locales';
import { columns } from './data';
import { getMenuList, deleteMenu, type MenuItem } from '#/api/core/menu';
import MenuDrawer from './MenuDrawer.vue';
import { h, ref, nextTick, watch, onMounted, computed } from 'vue';
// @ts-ignore - 使用ts-ignore忽略模块未找到的错误
import XEUtils from 'xe-utils'

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
  children?: RowVO[]; // 添加children属性支持树形结构
}

// 获取表格引用
const gridRef = ref()

// 存储菜单列表数据
const menuListData = ref<MenuItem[]>([]);

// 存储表格展开状态
const isExpanded = ref<boolean>(false);

// 存储已展开的行ID
const expandedRowKeys = ref<number[]>([]);

// 搜索相关
const searchValue = ref('');
const searchResultMessage = ref('');
// 保存原始数据
const allData = ref<RowVO[]>([]);

// 监听展开状态变化
watch(isExpanded, (val) => {
  if (!val) {
    // 折叠全部时清空已展开行ID
    expandedRowKeys.value = [];
  }
});

// 保存当前展开状态
const saveExpandedState = () => {
  try {
    // 从表格中获取当前展开的行
    if (gridApi.grid) {
      const expandedRows = gridApi.grid.getTreeExpandRecords();
      expandedRowKeys.value = expandedRows.map(row => row.id);
      
      // 如果有展开的行，设置isExpanded为true
      if (expandedRowKeys.value.length > 0) {
        isExpanded.value = true;
      }
      
      // 保存到本地存储
      localStorage.setItem('menu-expanded-rows', JSON.stringify(expandedRowKeys.value));
    }
  } catch (error) {
    console.error('保存展开状态失败:', error);
  }
};

// 恢复展开状态
const restoreExpandedState = () => {
  try {
    // 尝试从本地存储获取
    const storedExpandedRows = localStorage.getItem('menu-expanded-rows');
    if (storedExpandedRows) {
      expandedRowKeys.value = JSON.parse(storedExpandedRows);
      
      // 如果有保存的展开行，设置isExpanded为true
      if (expandedRowKeys.value.length > 0) {
        isExpanded.value = true;
      }
    }
  } catch (error) {
    console.error('恢复展开状态失败:', error);
  }
};

// 应用展开状态到表格
const applyExpandedState = () => {
  if (!gridApi.grid || expandedRowKeys.value.length === 0) return;
  
  // 延迟执行以确保表格数据已加载
  setTimeout(() => {
    try {
      expandedRowKeys.value.forEach(rowId => {
        // 获取行并展开
        const row = gridApi.grid?.getRowById(rowId);
        if (row) {
          gridApi.grid?.setTreeExpand(row, true);
        }
      });
    } catch (error) {
      console.error('应用展开状态失败:', error);
    }
  }, 300);
};

// 修改列配置以支持HTML渲染
const enhancedColumns = (columns || []).map(column => {
  // 对name、title和path列启用HTML渲染
  if (column && column.field && ['name', 'title', 'path'].includes(column.field)) {
    return {
      ...column,
      // @ts-ignore - vxe-table类型定义不完整，忽略type:html的类型错误
      type: 'html' // 使用内置的html类型
    };
  }
  return column;
});

// 配置表格选项
const gridOptions: VxeGridProps<RowVO> = {
  // @ts-ignore - 忽略columns类型不匹配问题
  columns: enhancedColumns,
  printConfig: {},
  exportConfig: {type: 'xlsx'},
  proxyConfig: {
    ajax: {
      query: async () => {
        // 默认接收 Promise<any[]>
        const res = await getMenuList();
        // 保存菜单数据供树形选择器使用
        menuListData.value = res;
        // 保存原始数据用于搜索
        allData.value = JSON.parse(JSON.stringify(res));
        console.log('加载的菜单数据:', res.length);
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
    resizable: true,
    useKey: true  // 添加useKey参数，解决html类型列的警告
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
    export: true,
    refresh: { code: 'query' },
    zoom: true,
    print: true,
  }
};

// 表格
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
  gridEvents: {
    // 树形展开状态改变事件
    toggleTreeExpand: (params: { expanded: boolean; row: RowVO }) => {
      const { expanded, row } = params;
      if (expanded) {
        // 添加到已展开行数组
        if (!expandedRowKeys.value.includes(row.id)) {
          expandedRowKeys.value.push(row.id);
        }
      } else {
        // 从已展开行数组移除
        const index = expandedRowKeys.value.indexOf(row.id);
        if (index !== -1) {
          expandedRowKeys.value.splice(index, 1);
        }
      }
      // 保存展开状态
      saveExpandedState();
    }
  }
});

// 在mounted时将gridApi.grid赋值给gridRef
onMounted(() => {
  gridRef.value = gridApi.grid;
  restoreExpandedState();
  // 延迟执行，确保数据已加载
  setTimeout(() => {
    debugMenuData();
  }, 1000);
});

// 模态框
const [Modal, modalApi] = useVbenModal({
  // 连接抽离的组件
  connectedComponent: MenuDrawer,
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
  // 查找当前菜单项的父级菜单ID
  const parentId = row.parentId === null ? 0 : row.parentId;
  // 再设置数据并打开模态框（确保带入parentId）
  modalApi.setData({
    ...row,
    parentId: parentId
  });
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
    gridApi.grid?.setAllTreeExpand(true);
    
    // 保存所有行的ID
    const allRows = gridApi.grid.getData();
    expandedRowKeys.value = allRows.map(row => row.id);
    saveExpandedState();
  }
};

// 处理折叠全部
const handleCollapseAll = () => {
  isExpanded.value = false;
  expandedRowKeys.value = [];
  if (gridApi.grid) {
    gridApi.grid?.setAllTreeExpand(false);
    saveExpandedState();
  }
};

// 处理刷新
const handleRefresh = (fromModal = false) => {
  // 保存当前展开状态
  saveExpandedState();
  
  gridApi.reload().then(() => {
    // 如果有已保存的展开状态，应用它
    if (expandedRowKeys.value.length > 0) {
      setTimeout(() => {
        applyExpandedState();
      }, fromModal ? 500 : 200);
    }
  });
};

// 处理Modal成功事件
const handleModalSuccess = () => {
  // 传入true表示来自模态框的刷新
  handleRefresh(true);
};

// 输出菜单数据结构，用于调试
const debugMenuData = () => {
  console.log('菜单数据数量:', menuListData.value.length);
  if (menuListData.value.length > 0) {
    console.log('第一项数据:', menuListData.value[0]);
    // 检查是否有children属性
    const hasChildren = menuListData.value.some(item => (item as any).children && (item as any).children.length > 0);
    console.log('数据是否有children属性:', hasChildren);
    
    // 输出所有数据的id和name
    const items = menuListData.value.map(item => ({
      id: item.id,
      name: item.name,
      title: item.title,
      parentId: item.parentId
    }));
    console.log('所有菜单项:', items);
  }
};

// 搜索功能 - 按照官方示例实现
const handleSearch = () => {
  const filterVal = XEUtils.toValueString(searchValue.value).trim().toLowerCase();
  if (filterVal) {
    try {
      // 生成正则表达式用于高亮
      const filterRE = new RegExp(filterVal, 'gi');
      // 设置要搜索的属性
      const searchProps = ['name'];
      
      // 使用XEUtils搜索树数据
      // @ts-ignore - 忽略搜索函数参数类型错误
      const rest = XEUtils.searchTree(allData.value, (item) => {
        return searchProps.some(key => 
          String((item as any)[key] || '').toLowerCase().indexOf(filterVal) > -1
        );
      }, { children: 'children', isEvery: false });
      // 遍历结果，替换文本为高亮版本
      // @ts-ignore - 忽略遍历函数参数类型错误
      XEUtils.eachTree(rest, (item) => {
        searchProps.forEach(key => {
          if ((item as any)[key]) {
            (item as any)[key] = String((item as any)[key]).replace(filterRE, (match) => 
              `<span class="keyword-highlight">${match}</span>`
            );
          }
        });
      }, { children: 'children' });
      
      // 更新表格数据
      if (gridApi.grid) {
        gridApi.grid.loadData(rest);
      }
      
      // 设置搜索结果消息
      searchResultMessage.value = rest.length > 0 
        ? $t('system.searchResult', { count: rest.length }) 
        : $t('system.noResult');
      
      // 搜索之后默认展开所有子节点
      nextTick(() => {
        if (gridApi.grid) {
          gridApi.grid.setAllTreeExpand(true);
        }
      });
    } catch (error) {
      searchResultMessage.value = $t('system.searchError');
    }
  } else {
    // 清空搜索时恢复原始数据
    searchResultMessage.value = '';
    
    // 恢复原始数据
    if (gridApi.grid && allData.value.length > 0) {
      gridApi.grid.loadData(allData.value);
      
      // 恢复展开状态
      setTimeout(() => {
        applyExpandedState();
      }, 100);
    }
  }
};

// 节流函数,间隔300毫秒触发搜索
const searchEvent = XEUtils.throttle(function () {
  handleSearch();
}, 300, { trailing: true, leading: true });

// 监听搜索值变化
watch(searchValue, (val, oldVal) => {
  if (val !== oldVal) {
    searchEvent();
  }
});

</script>

<template>
  <div class="p-5" style="height: calc(100vh - 80px) !important;">
    <Grid ref="gridRef">
      <template #toolbar-actions>
        <Button type="primary" @click="openModal">
          <IconifyIcon icon="ant-design:plus-outlined" class="mr-1" />
          {{ $t('system.create') }}
        </Button>
        <Button class="ml-2" @click="handleExpandAll">
          <IconifyIcon icon="ant-design:node-expand-outlined" class="mr-1" />
          {{ $t('system.expandAll') }}
        </Button>
        <Button class="ml-2" @click="handleCollapseAll">
          <IconifyIcon icon="ant-design:node-collapse-outlined" class="mr-1" />
          {{ $t('system.collapseAll') }}
        </Button>
        <div class="flex items-center ml-4">
          <Input 
            v-model:value="searchValue" 
            :placeholder="$t('system.search')" 
            allow-clear
            style="width: 220px;"
            class="mr-2"
            @pressEnter="handleSearch"
          >
            <template #prefix>
              <IconifyIcon icon="ant-design:search-outlined" />
            </template>
          </Input>
          
          <span v-if="searchResultMessage" class="ml-3 text-sm" :class="searchResultMessage.includes('No') || searchResultMessage.includes('未找到') ? 'text-red-600' : 'text-blue-600'">
            {{ searchResultMessage }}
          </span>
        </div>
      </template>
      <template #action="{ row }">
        <div class="flex items-center space-x-2">
          <Button type="link" size="small" class="px-1" @click="() => handleAdd(row)">
            <IconifyIcon icon="ant-design:plus-outlined" class="mr-1" />
            {{ $t('system.add') }}
          </Button>
          <Button type="link" size="small" class="px-1" @click="() => handleEdit(row)">
            <IconifyIcon icon="ant-design:edit-outlined" class="mr-1" />
            {{ $t('system.edit') }}
          </Button>
          <Button type="link" size="small" class="px-1" danger @click="() => handleDelete(row)">
            <IconifyIcon icon="ant-design:delete-outlined" class="mr-1" />
            {{ $t('system.delete') }}
          </Button>
        </div>
      </template>
    </Grid>
    <Modal @success="handleModalSuccess" :menuList="menuListData" />
  </div>
</template>

<style scoped>
/* 添加关键词高亮样式 */
:deep(.keyword-highlight) {
  padding: 0 2px;
  font-weight: bold;
  background-color: #FF0;
  border-radius: 2px;
}
</style>
