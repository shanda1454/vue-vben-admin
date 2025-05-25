<script lang="ts" setup>
import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import { Page, useVbenModal, confirm } from '@vben/common-ui';
import { Plus, IconifyIcon } from '@vben/icons';
import { SearchOutlined } from '@ant-design/icons-vue';

import { Button, message, Input, Card, Spin, Empty, Modal, Tabs } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteForm, getFormList } from '#/api/formManagement';
import type { FormManagementApi } from '#/api/formManagement';

import { useColumns } from './data';
import Form from './modules/form.vue';
import FieldConfig from './modules/FieldConfig.vue';
import { ref, watch, onMounted, h, reactive, onUnmounted, nextTick } from 'vue';
import FormModalComponent from './modules/FormModal.vue';

// 加载状态
const loading = ref(false);
// 表单数据
const formListData = ref<FormManagementApi.FormBase[]>([]);
// 是否有数据
const hasData = ref(false);
// 原始数据备份，防止数据丢失
const originalData = ref<FormManagementApi.FormBase[]>([]);

// 搜索相关
const searchValue = ref('');
const searchResultMessage = ref('');

// 表单模态框
const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

// 当前选中的表单，用于字段配置
const currentForm = ref<FormManagementApi.FormBase | null>(null);

// 选项卡相关
const activeKey = ref('list'); // 默认显示列表
const designLoading = ref(false); // 设计器加载状态

// 表格组件
const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(onActionClick),
    height: '100%',
    border: 'none',
    stripe: true,
    keepSource: true,
    showOverflow: true,
    columnConfig: {
      resizable: true,
      useKey: true,
      minWidth: 100,
    },
    pagerConfig: {
      enabled: true,
      pageSize: 20,
      pageSizes: [10, 20, 50, 100],
      layouts: ['PrevPage', 'JumpNumber', 'NextPage', 'FullJump', 'Sizes', 'Total'],
      perfect: true,
      autoHidden: false,
      background: true,
      className: 'form-table-pager',
      total: 0, // 初始设置为0，后续会更新
      borderWidth: 0, // 设置边框宽度为0
    },
    emptyRender: {
      name: 'EmptyRender',
      render: () => {
        if (loading.value) {
          return null;
        }
        return h(Empty, {
          description: '暂无数据',
          image: Empty.PRESENTED_IMAGE_SIMPLE
        });
      }
    },
    loadingConfig: {
      text: '加载中...',
      background: 'rgba(255, 255, 255, 0.7)',
      icon: 'vxe-icon-loading',
      size: 'medium'
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
      useKey: true
    },
    toolbarConfig: {
      refresh: { code: 'query' },
      custom: true,
      slots: {
        buttons: () => {
          return h('div', { class: 'flex items-center' }, [
            h(Button, {
              type: 'primary',
              onClick: onCreate,
              class: 'mr-2'
            }, {
              default: () => [
                h(IconifyIcon, {
                  icon: 'ant-design:plus-outlined',
                  class: 'mr-1'
                }),
                '创建表单'
              ]
            }),
            h('div', { class: 'flex items-center ml-4' }, [
              h(Input, {
                value: searchValue.value,
                'onUpdate:value': (val) => searchValue.value = val,
                placeholder: '搜索表单',
                allowClear: true,
                style: { width: '220px' },
                class: 'mr-2',
                onKeypress: handleSearchInputKeyPress
              }, {
                prefix: () => h(SearchOutlined)
              }),
              h(Button, {
                type: 'primary',
                onClick: handleSearch,
                class: 'mr-2'
              }, {
                default: () => [
                  h(IconifyIcon, {
                    icon: 'ant-design:search-outlined',
                    class: 'mr-1'
                  }),
                  '搜索'
                ]
              }),
              h(Button, {
                onClick: onRefresh
              }, {
                default: () => [
                  h(IconifyIcon, {
                    icon: 'ant-design:reload-outlined',
                    class: 'mr-1'
                  }),
                  '重置'
                ]
              }),
              searchResultMessage.value ? h('span', {
                class: `ml-3 text-sm ${searchResultMessage.value.includes('未找到') ? 'text-red-600' : 'text-blue-600'}`
              }, searchResultMessage.value) : null
            ])
          ]);
        }
      }
    },
    printConfig: {},
    exportConfig: { type: 'xlsx' },
  } as VxeTableGridOptions,
});

// 设置模态框状态
const modalState = reactive({
  isVisible: false,
  title: '创建表单',
  formData: {} as Partial<FormManagementApi.FormBase>
});

/**
 * 表格操作按钮点击处理
 */
function onActionClick({
  code,
  row,
}: {
  code: string;
  row: FormManagementApi.FormBase;
}) {
  switch (code) {
    case 'edit': {
      onEdit(row);
      break;
    }
    case 'config': {
      onConfig(row);
      break;
    }
    case 'delete': {
      onDelete(row);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * 刷新表格数据
 */
function onRefresh() {
  searchValue.value = '';
  searchResultMessage.value = '';
  
  // 调用简化的数据加载函数
  loadFormData();
}

/**
 * 编辑表单
 */
function onEdit(row: FormManagementApi.FormBase) {
  modalState.title = `编辑表单 - ${row.formName}`;
  modalState.formData = row;
  modalState.isVisible = true;
}

/**
 * 配置表单字段
 */
function onConfig(row: FormManagementApi.FormBase) {
  if (!row || !row.id) {
    message.warning('无效的表单，请先选择一个有效的表单');
    return;
  }
  
  // 确保formId是有效的数字
  const formId = Number(row.id);
  if (isNaN(formId) || formId <= 0) {
    message.warning('表单ID无效，请选择其他表单');
    return;
  }
  
  // 切换到表单设计选项卡
  designLoading.value = true;
  currentForm.value = { ...row };
  
  setTimeout(() => {
    activeKey.value = 'design';
    designLoading.value = false;
  }, 300);
}

/**
 * 创建新表单
 */
function onCreate() {
  modalState.title = '创建表单';
  modalState.formData = {};
  modalState.isVisible = true;
}

/**
 * 删除表单
 */
async function onDelete(row: FormManagementApi.FormBase) {
  try {
    await confirm({
      title: '删除表单',
      content: `确定要删除表单 "${row.formName}" 吗？这将同时删除相关的表单字段配置。`,
      icon: 'warning',
    });
    
    const hideLoading = message.loading({
      content: `正在删除表单 "${row.formName}"...`,
      duration: 0,
      key: 'form_delete_loading',
    });
    
    await deleteForm(row.id);
    
    message.success({
      content: `表单 "${row.formName}" 删除成功`,
      key: 'form_delete_loading',
    });
    onRefresh();
  } catch (error) {
    // 忽略取消操作的错误
    if (error instanceof Error && error.message !== 'dialog cancelled') {
      console.error('删除失败:', error);
      message.error({
        content: `删除表单失败: ${error instanceof Error ? error.message : '未知错误'}`,
        key: 'form_delete_loading',
      });
    }
  }
}

/**
 * 处理搜索
 */
function handleSearch() {
  const filterVal = searchValue.value.trim().toLowerCase();
  if (!filterVal) {
    // 如果搜索值为空，恢复所有数据
    searchResultMessage.value = '';
    loadFormData();
    return;
  }
  
  console.log('执行搜索，关键词:', filterVal);
  
  try {
    // 从原始数据中过滤
    if (originalData.value && originalData.value.length > 0) {
      const filteredData = originalData.value.filter(
        item => {
          return (
            (item.formName && item.formName.toLowerCase().includes(filterVal)) || 
            (item.tableName && item.tableName.toLowerCase().includes(filterVal)) ||
            (item.module && item.module.toLowerCase().includes(filterVal)) ||
            (item.description && item.description.toLowerCase().includes(filterVal))
          );
        }
      );
      
      console.log('搜索结果数量:', filteredData.length);
      
      if (filteredData.length > 0) {
        searchResultMessage.value = `搜索到 ${filteredData.length} 个结果`;
        // 直接更新表格数据
        gridApi.setGridOptions({
          data: filteredData
        });
      } else {
        searchResultMessage.value = '未找到匹配的记录';
        // 设置空数据
        gridApi.setGridOptions({
          data: []
        });
      }
    } else {
      console.warn('原始数据为空，无法执行搜索');
      searchResultMessage.value = '数据源为空，请先加载数据';
      loadFormData(); // 尝试重新加载数据
    }
  } catch (error) {
    console.error('搜索过程中出错:', error);
    message.error('搜索失败，请重试');
    searchResultMessage.value = '搜索出错';
  }
}

// 处理模态框成功事件
function handleModalSuccess() {
  onRefresh();
}

// 返回表单列表
function returnToList() {
  activeKey.value = 'list';
  currentForm.value = null;
}

// 监听搜索值变化
watch(searchValue, (val, oldVal) => {
  if (val !== oldVal && val.trim() === '') {
    searchResultMessage.value = '';
    onRefresh();
  }
});

// 组件挂载时加载表单列表
onMounted(async () => {
  // 确保加载数据
  console.log('表单管理页面已挂载，准备加载数据');
  
  try {
    // 直接加载数据，不通过nextTick避免可能的循环
    await loadFormData();
  } catch (error) {
    console.error('初始加载数据失败:', error);
    message.error('加载表单数据失败，请刷新页面重试');
  }
  
  // 监听窗口大小变化，当窗口调整大小时确保数据不丢失
  window.addEventListener('resize', handleResize);
});

// 简化数据加载流程，直接调用API
async function loadFormData() {
  try {
    loading.value = true;
    console.log('开始直接调用getFormList API');
    
    const data = await getFormList();
    console.log('API返回数据条数:', data?.length || 0);
    
    // 保存完整数据
    formListData.value = data || [];
    originalData.value = JSON.parse(JSON.stringify(data || []));
    hasData.value = (data && data.length > 0) ? true : false;
    
    // 更新分页器总数
    const totalCount = data?.length || 0;
    
    // 直接设置表格数据和分页信息
    gridApi.setGridOptions({
      data: formListData.value,
      pagerConfig: {
        total: totalCount,
      }
    });
    
    console.log('数据加载完成，已设置到表格，总记录数:', totalCount);
  } catch (error) {
    console.error('加载表单列表失败:', error);
    message.error('加载表单列表失败');
  } finally {
    loading.value = false;
  }
}

/**
 * A simplified version of the resize handler
 */
function handleResize() {
  console.log('检测到窗口大小变化');
  
  // 如果当前没有数据但原始数据存在，恢复数据
  if (formListData.value.length === 0 && originalData.value.length > 0) {
    console.log('窗口大小变化后恢复数据');
    gridApi.setGridOptions({
      data: originalData.value
    });
  }
}

// 修复Input的问题
function handleSearchInputKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    handleSearch();
  }
}

// 确保组件在销毁前清理引用
onUnmounted(() => {
  // 清理可能导致空引用的对象
  formListData.value = [];
  currentForm.value = null;
  originalData.value = []; // 清空原始数据缓存
  
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize);
  
  // 防止Vue内部组件更新时访问已卸载的DOM元素
  try {
    // 主动移除可能会在组件卸载后引起问题的元素
    const toolbars = document.querySelectorAll('.vxe-table--toolbar');
    toolbars.forEach(el => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  } catch (e) {
    console.warn('清理DOM元素失败', e);
  }
});
</script>

<template>
  <div class="form-management-container">
    <Page class="form-page">
      <Tabs v-model:activeKey="activeKey" class="form-tabs">
        <!-- 表单列表选项卡 -->
        <Tabs.TabPane key="list" tab="表单列表">
          <Spin :spinning="loading" class="full-container">
            <Grid class="full-grid">
              <template #toolbar-actions>
                <Button type="primary" @click="onCreate" class="matrix-btn">
                  <IconifyIcon icon="ant-design:plus-outlined" class="mr-1" />
                  创建表单
                </Button>
                <div class="flex items-center ml-4">
                  <Input 
                    v-model:value="searchValue" 
                    placeholder="搜索表单" 
                    allow-clear
                    style="width: 220px;"
                    class="mr-2 matrix-input"
                    @keyup.enter="handleSearch"
                  >
                    <template #prefix>
                      <SearchOutlined />
                    </template>
                  </Input>
                  <Button type="primary" @click="handleSearch" class="mr-2 matrix-btn">
                    <IconifyIcon icon="ant-design:search-outlined" class="mr-1" />
                    搜索
                  </Button>
                  <Button @click="onRefresh" class="matrix-btn">
                    <IconifyIcon icon="ant-design:reload-outlined" class="mr-1" />
                    重置
                  </Button>
                  <span v-if="searchResultMessage" class="ml-3 text-sm" :class="searchResultMessage.includes('未找到') ? 'text-red-600' : 'text-blue-600'">
                    {{ searchResultMessage }}
                  </span>
                </div>
              </template>
              <template #action="{ row }">
                <div class="matrix-actions">
                  <Button type="link" size="small" class="matrix-btn-link" @click="onEdit(row)">
                    <IconifyIcon icon="ant-design:edit-outlined" class="mr-1" />
                    编辑
                  </Button>
                  <Button type="link" size="small" class="matrix-btn-link" @click="onConfig(row)">
                    <IconifyIcon icon="ant-design:tool-outlined" class="mr-1" />
                    字段维护
                  </Button>
                  <Button type="link" size="small" class="matrix-btn-link-danger" danger @click="onDelete(row)">
                    <IconifyIcon icon="ant-design:delete-outlined" class="mr-1" />
                    删除
                  </Button>
                </div>
              </template>
            </Grid>
          </Spin>
        </Tabs.TabPane>
        
        <!-- 表单设计选项卡 -->
        <Tabs.TabPane key="design" tab="表单设计" :forceRender="false">
          <Spin :spinning="designLoading" tip="加载中..." size="large" class="full-container">
            <Card v-if="!currentForm" class="empty-design">
              <Empty description="请先选择一个表单进行设计" />
              <div class="empty-design-actions">
                <Button @click="activeKey = 'list'" class="matrix-btn">返回表单列表</Button>
              </div>
            </Card>
            <template v-else>
              <FieldConfig
                :formId="currentForm.id"
                :formName="currentForm.formName || ''"
                @success="returnToList"
                @cancel="returnToList"
              />
            </template>
          </Spin>
        </Tabs.TabPane>
      </Tabs>
    </Page>
    
    <!-- 使用组件直接传入modalState属性，避免中间组件 -->
    <FormModalComponent
      v-model:visible="modalState.isVisible"
      :title="modalState.title"
      :formData="modalState.formData"
      @success="handleModalSuccess"
    />
  </div>
</template>

<style scoped>
/* 重新添加表格主容器结构 */
.vxe-table--main-wrapper {
  display: flex !important;
  flex: 1 !important;
  flex-direction: column !important;
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
}

/* 调整主容器高度和滚动行为 */
.form-management-container {
  position: relative;
  box-sizing: border-box; /* 确保边框盒模型 */
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 90px);
  margin: 0; /* 清除外边距 */
  overflow: hidden;
}

.form-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

/* 全尺寸容器 */
.full-container {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0; /* 防止flex子项溢出 */
  overflow: hidden;
}

.full-grid {
  width: 100%;
  height:  calc(100vh - 180px);
  min-height: 0; /* 防止flex子项溢出 */
  overflow: hidden;
}

/* 标签页设置 */
.form-tabs {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 操作按钮样式 */
.space-x-2 > * + * {
  margin-left: 8px;
}

.matrix-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
  min-width: 210px;
  white-space: nowrap;
}

.matrix-btn {
  height: 32px;
  padding: 0 16px;
  font-weight: 500;
  border-radius: 4px;
  transition: all 0.2s;
}

.matrix-btn-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  height: 28px;
  padding: 0 8px;
  color: #1890ff;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.matrix-btn-link:hover {
  color: #40a9ff;
  background-color: rgb(24 144 255 / 10%);
}

.matrix-btn-link-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  height: 28px;
  padding: 0 8px;
  color: #ff4d4f;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.matrix-btn-link-danger:hover {
  color: #ff7875;
  background-color: rgb(255 77 79 / 10%);
}

.matrix-input {
  border-radius: 4px;
}

/* 空状态样式 */
.empty-design {
  padding: 32px 0;
  margin: 24px;
}

.empty-design-actions {
  margin-top: 16px;
  text-align: center;
}

/* 辅助样式 */
.mr-1 { margin-right: 4px; }

.mr-2 { margin-right: 8px; }

.ml-3 { margin-left: 12px; }

.ml-4 { margin-left: 16px; }

.text-sm { font-size: 14px; }

.text-red-600 { color: #f5222d; }

.text-blue-600 { color: #1890ff; }

.flex { display: flex; }

.items-center { align-items: center; }

.px-1 { 
  padding-right: 4px; 
  padding-left: 4px; 
}

/* 关键词高亮样式 */
:deep(.keyword-highlight) {
  padding: 0 2px;
  font-weight: bold;
  background-color: #FF0;
  border-radius: 2px;
}
</style>

<style>
/* 高对比度模式适配 */
@media (prefers-contrast: more) {
  .vxe-table {
    border-width: 2px !important;
  }
  
  .vxe-header--column,
  .vxe-body--column {
    border-width: 2px !important;
  }
  
  .text-blue-600 { color: #0070cc; }

  .text-red-600 { color: #d32029; }
  
  .vxe-pager .vxe-pager--btn:hover {
    background-color: #e6f7ff;
  }
  
  :deep(.keyword-highlight) {
    background-color: #FF0;
    outline: 1px solid #000;
  }
}

/* 基本布局样式 */
.ant-tabs-content {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  padding-bottom: 0;
  overflow: hidden;
}

.vben-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

.vben-page-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 12px;
  padding-bottom: 0; /* 移除底部多余内边距 */
  overflow: hidden;
}

/* 移除可能导致底部空白的元素 */
.form-management-container::after,
.vben-page::after,
.vben-page-content::after {
  display: none !important;
}

/* 确保分页器没有多余边距 */
.vxe-pager .vxe-pager--wrapper {
  padding: 0;
}

/* 去掉分页器边框 */
.vxe-pager {
  border: none !important;
}

/* 过渡动画 */
.form-management-container,
.vxe-table,
.vxe-pager,
.vxe-toolbar,
.ant-card,
.ant-tabs-nav,
.vxe-table--header,
.vxe-body--row,
.vxe-header--column,
.vxe-body--column,
.ant-input,
.ant-input-affix-wrapper,
.ant-btn,
.ant-btn-link,
.ant-tabs-tab,
.text-blue-600,
.text-red-600 {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>

