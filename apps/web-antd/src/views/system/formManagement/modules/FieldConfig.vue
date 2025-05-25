<!-- @ts-nocheck -->
<script lang="ts" setup>
import { ref, onMounted, watch, computed } from 'vue';
import { message, Button, Tabs, Divider, Space, Card, Spin } from 'ant-design-vue';
import { PlusOutlined, TableOutlined, FormOutlined } from '@ant-design/icons-vue';
import FieldTable from './FieldTable.vue';
import FieldModal from './FieldModal.vue';
import SubTableModal from './SubTableModal.vue';
// 导入正确的接口类型和API方法
import { 
  getFormDetail,
  updateForm
} from '#/api/formManagement';
import type { FormManagementApi } from '#/api/formManagement';

const props = defineProps<{
  formId?: number;
  formName: string;
}>();

const emit = defineEmits(['success', 'cancel']);

// 表单详情
const formDetail = ref<FormManagementApi.FormDetail | null>(null);
// 主表字段
const fields = ref<FormManagementApi.FormField[]>([]);
// 子表列表
const subTables = ref<FormManagementApi.FormSubTable[]>([]);
// 子表字段映射 { 子表ID: 字段列表 }
const subTableFields = ref<Record<number, FormManagementApi.FormField[]>>({});

// 字段模态框
const fieldModalVisible = ref(false);
const editingField = ref<Partial<FormManagementApi.FormField> | null>(null);
const currentTableType = ref<'main' | 'sub' | 'grandson'>('main');
const currentSubTableId = ref<number | undefined>(undefined);

// 子表模态框
const subTableModalVisible = ref(false);
const editingSubTable = ref<Partial<FormManagementApi.FormSubTable> | null>(null);

// 当前激活的标签页
const activeTabKey = ref('main-fields');

// 是否在加载中
const loading = ref(false);

// 主表名称
const mainTableName = computed(() => formDetail.value?.tableName || '');

// 加载表单详情和字段
const loadFormData = async () => {
  try {
    if (props.formId === undefined || isNaN(Number(props.formId))) {
      console.error('FieldConfig - 无效的formId:', props.formId);
      message.warning('请先选择一个有效的表单');
      return;
    }
    
    console.log('FieldConfig - 开始加载表单数据, formId:', props.formId);
    loading.value = true;
    
    // 加载表单详情
    const formId = Number(props.formId);
    const result = await getFormDetail(formId);
    console.log('FieldConfig - 获取到表单详情:', result);
    
    formDetail.value = result;
    if (formDetail.value) {
      fields.value = formDetail.value.mainFields || [];
      subTables.value = formDetail.value.subTables || [];
      subTableFields.value = formDetail.value.subFields || {};
      console.log('FieldConfig - 数据加载成功, 主表字段数:', fields.value.length, '子表数:', subTables.value.length);
    } else {
      console.warn('FieldConfig - 表单详情返回为空');
      message.warning('未找到表单数据');
    }
  } catch (e) {
    console.error('FieldConfig - 加载数据失败:', e);
    message.error('加载表单数据失败，请检查网络连接或联系管理员');
  } finally {
    loading.value = false;
  }
};

// 添加主表字段
const handleAddMainField = () => {
  if (props.formId === undefined || isNaN(Number(props.formId))) {
    message.warning('请先选择一个有效的表单');
    return;
  }
  
  currentTableType.value = 'main';
  currentSubTableId.value = undefined;
  const newField: Partial<FormManagementApi.FormField> = {
    formId: Number(props.formId),
    tableType: 'main',
    orderNo: fields.value.length + 1,
    dbFieldName: '',
    entityFieldName: '',
    fieldLabel: '',
    fieldType: 'VarChar',
    isViewField: false,
    isRequired: false,
    nonNegative: false,
    nonZero: false,
    isCheckboxStyle: false,
    isPercentageStyle: false,
    defaultValue: '',
    description: '',
    placeholder: '',
    minValue: null,
    maxValue: null,
    precision: 2,
    controlType: 'input',
    options: []
  };
  editingField.value = newField;
  fieldModalVisible.value = true;
};

// 添加子表字段
const handleAddSubTableField = (subTableId: number, tableType: 'sub' | 'grandson') => {
  if (props.formId === undefined || isNaN(Number(props.formId)) || !subTableId) {
    message.warning('缺少必要参数');
    return;
  }
  
  currentTableType.value = tableType;
  currentSubTableId.value = subTableId;
  const subTableFieldList = subTableFields.value[subTableId] || [];
  const newField: Partial<FormManagementApi.FormField> = {
    formId: Number(props.formId),
    tableType: tableType,
    tableId: subTableId,
    orderNo: subTableFieldList.length + 1,
    dbFieldName: '',
    entityFieldName: '',
    fieldLabel: '',
    fieldType: 'VarChar',
    isViewField: false,
    isRequired: false,
    nonNegative: false,
    nonZero: false,
    isCheckboxStyle: false,
    isPercentageStyle: false,
    defaultValue: '',
    description: '',
    placeholder: '',
    minValue: null,
    maxValue: null,
    precision: 2,
    controlType: 'input',
    options: []
  };
  editingField.value = newField;
  fieldModalVisible.value = true;
};

// 编辑字段
const handleEditField = (field: FormManagementApi.FormField) => {
  currentTableType.value = field.tableType;
  currentSubTableId.value = field.tableId;
  editingField.value = { ...field };
  fieldModalVisible.value = true;
};

// 删除字段
const handleDeleteField = async (field: FormManagementApi.FormField) => {
  try {
    if (!formDetail.value) return;

    if (field.tableType === 'main') {
      formDetail.value.mainFields = fields.value.filter(f => f.id !== field.id);
    } else if (field.tableId && subTableFields.value[field.tableId]) {
      // 防御性编程，确保数组存在
      if (!subTableFields.value[field.tableId]) {
        subTableFields.value[field.tableId] = [];
      }
      subTableFields.value[field.tableId] = subTableFields.value[field.tableId].filter(f => f.id !== field.id);
      formDetail.value.subFields = subTableFields.value;
    }

    await updateForm(formDetail.value);
    message.success('删除成功');
    await loadFormData();
  } catch (error) {
    message.error('删除失败');
    console.error('删除字段失败:', error);
  }
};

// 保存字段
const handleSaveField = async (field: FormManagementApi.FormField) => {
  try {
    if (!formDetail.value) return;

    if (field.tableType === 'main') {
      if (field.id) {
        const index = fields.value.findIndex(f => f.id === field.id);
        if (index !== -1) {
          fields.value[index] = field;
        }
      } else {
        fields.value.push(field);
      }
      formDetail.value.mainFields = fields.value;
    } else if (field.tableId) {
      // 确保子表字段数组已初始化
      if (!subTableFields.value[field.tableId]) {
        subTableFields.value[field.tableId] = [];
      }
      
      if (field.id) {
        const index = subTableFields.value[field.tableId].findIndex(f => f.id === field.id);
        if (index !== -1) {
          subTableFields.value[field.tableId][index] = field;
        }
      } else {
        subTableFields.value[field.tableId].push(field);
      }
      formDetail.value.subFields = subTableFields.value;
    }

    await updateForm(formDetail.value);
    message.success('保存成功');
    fieldModalVisible.value = false;
    await loadFormData();
  } catch (error) {
    message.error('保存失败');
    console.error('保存字段失败:', error);
  }
};

// 添加子表
const handleAddSubTable = () => {
  if (props.formId === undefined || isNaN(Number(props.formId))) {
    message.warning('请先选择一个有效的表单');
    return;
  }
  
  const newSubTable: FormManagementApi.FormSubTable = {
    id: Date.now(), // 临时ID，后端会重新生成
    formId: Number(props.formId),
    orderNo: subTables.value.length + 1,
    tableName: '',
    description: '',
    tableType: 'sub' // 添加默认类型
  };
  editingSubTable.value = newSubTable;
  subTableModalVisible.value = true;
};

// 编辑子表
const handleEditSubTable = (subTable: FormManagementApi.FormSubTable) => {
  editingSubTable.value = { ...subTable };
  subTableModalVisible.value = true;
};

// 删除子表
const handleDeleteSubTable = async (subTable: FormManagementApi.FormSubTable) => {
  try {
    if (!formDetail.value) return;

    formDetail.value.subTables = subTables.value.filter(t => t.id !== subTable.id);
    delete subTableFields.value[subTable.id];
    formDetail.value.subFields = subTableFields.value;

    await updateForm(formDetail.value);
    message.success('删除成功');
    await loadFormData();
  } catch (error) {
    message.error('删除失败');
    console.error('删除子表失败:', error);
  }
};

// 保存子表
const handleSaveSubTable = async (subTable: FormManagementApi.FormSubTable) => {
  try {
    if (!formDetail.value) return;

    if (subTable.id) {
      const index = subTables.value.findIndex(t => t.id === subTable.id);
      if (index !== -1) {
        subTables.value[index] = subTable;
      }
    } else {
      subTables.value.push(subTable);
    }
    formDetail.value.subTables = subTables.value;

    await updateForm(formDetail.value);
    message.success('保存成功');
    subTableModalVisible.value = false;
    await loadFormData();
  } catch (error) {
    message.error('保存失败');
    console.error('保存子表失败:', error);
  }
};

// 保存字段配置
const saveFieldConfig = async () => {
  try {
    if (!formDetail.value) return;
    
    // 更新表单详情
    formDetail.value.mainFields = fields.value;
    formDetail.value.subTables = subTables.value;
    formDetail.value.subFields = subTableFields.value;
    
    // 保存更新
    await updateForm(formDetail.value);
    message.success('保存成功');
    emit('success');
  } catch (error) {
    console.error('保存字段配置失败:', error);
    message.error('保存失败');
  }
};

// 监听formId变化
watch(() => props.formId, (newVal) => {
  if (newVal) {
    loadFormData();
  }
}, { immediate: true });

// 组件挂载时加载数据
onMounted(() => {
  if (props.formId) {
    loadFormData();
  }
});
</script>

<template>
  <div class="field-config-container">
    <Spin :spinning="loading" tip="加载中..." size="large">
      <Card :bordered="false">
        <template #title>
          <div class="card-title">
            <span>【{{ props.formName }}】表单设计</span>
            <Space>
              <Button @click="emit('cancel')">返回</Button>
              <Button type="primary" @click="saveFieldConfig" class="save-btn">保存</Button>
            </Space>
          </div>
        </template>
        
        <div v-if="props.formId === undefined" class="empty-tip">
          请先选择一个有效的表单
        </div>
        <div v-else>
          <Tabs v-model:activeKey="activeTabKey">
            <!-- 主表字段标签页 -->
            <Tabs.TabPane key="main-fields" tab="主表字段">
              <div class="tab-header">
                <h3><FormOutlined /> 主表字段</h3>
                <Button type="primary" @click="handleAddMainField">
                  <PlusOutlined /> 新增字段
                </Button>
              </div>
              
              <FieldTable
                :fields="fields"
                :loading="loading"
                @edit="(field) => handleEditField(field)"
                @delete="(field) => handleDeleteField(field)"
              />
            </Tabs.TabPane>
            
            <!-- 子表管理标签页 -->
            <Tabs.TabPane key="sub-tables" tab="子表管理">
              <div class="tab-header">
                <h3><TableOutlined /> 子表管理</h3>
                <Button type="primary" @click="handleAddSubTable">
                  <PlusOutlined /> 新增子表/孙表
                </Button>
              </div>
              
              <div class="sub-tables-list">
                <div v-if="subTables.length === 0" class="empty-tip">
                  暂无子表，请点击"新增子表/孙表"按钮创建
                </div>
                <div v-else class="sub-table-cards">
                  <Card 
                    v-for="subTable in subTables" 
                    :key="subTable.id" 
                    :title="subTable.tableName"
                    :bordered="true"
                    class="sub-table-card"
                  >
                    <template #extra>
                      <Space>
                        <Button type="link" @click="() => activeTabKey = `sub-${subTable.id}`">管理字段</Button>
                        <Button type="link" @click="() => handleEditSubTable(subTable)">编辑</Button>
                        <Button type="link" danger @click="() => handleDeleteSubTable(subTable)">删除</Button>
                      </Space>
                    </template>
                    <div class="sub-table-info">
                      <p><strong>表名：</strong>{{ subTable.tableName }}</p>
                      <p><strong>类型：</strong>{{ subTable.tableType === 'sub' ? '子表' : '孙表' }}</p>
                      <p v-if="subTable.description"><strong>描述：</strong>{{ subTable.description }}</p>
                    </div>
                  </Card>
                </div>
              </div>
            </Tabs.TabPane>
            
            <!-- 每个子表的字段标签页 -->
            <Tabs.TabPane 
              v-for="subTable in subTables" 
              :key="`sub-${subTable.id}`" 
              :tab="subTable.tableName"
            >
              <div class="tab-header">
                <h3>
                  <TableOutlined /> {{ subTable.tableName }}
                </h3>
                <Space>
                  <Button type="link" @click="() => handleAddSubTableField(subTable.id, 'sub')">
                    <PlusOutlined /> 添加字段
                  </Button>
                  <Button type="link" @click="() => handleEditSubTable(subTable)">编辑</Button>
                  <Button type="link" danger @click="() => handleDeleteSubTable(subTable)">删除</Button>
                </Space>
              </div>
              
              <FieldTable
                :fields="subTableFields[subTable.id] || []"
                :loading="loading"
                @edit="(field) => handleEditField(field)"
                @delete="(field) => handleDeleteField(field)"
              />
            </Tabs.TabPane>
          </Tabs>
        </div>
      </Card>
    </Spin>
    
    <!-- 字段编辑模态框 -->
    <FieldModal
      v-model:open="fieldModalVisible"
      :field="editingField"
      :formId="Number(props.formId)"
      :tableType="currentTableType"
      :parentTableId="currentSubTableId"
      @save="handleSaveField"
    />
    
    <!-- 子表编辑模态框 -->
    <SubTableModal
      v-model:open="subTableModalVisible"
      :tableData="editingSubTable"
      :formId="Number(props.formId)"
      :formName="props.formName"
      :mainTableName="mainTableName"
      @save="handleSaveSubTable"
    />
  </div>
</template>

<style scoped>
.field-config-container {
  position: relative;
  height: calc(90vh - 200px);
  max-height: calc(90vh - 200px);
  overflow: hidden;
}

.card-title {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  background-color: #fff;
}

.save-btn {
  position: sticky;
  top: 0;
  z-index: 11;
}

.tab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.empty-tip {
  padding: 24px;
  font-size: 14px;
  color: #8c8c8c;
  text-align: center;
  background-color: #fafafa;
  border-radius: 4px;
}

.sub-tables-list {
  max-height: calc(90vh - 400px);
  margin-top: 16px;
  overflow-y: auto;
}

.sub-table-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.sub-table-card {
  margin-bottom: 16px;
}

.sub-table-info {
  font-size: 14px;
}

.sub-table-info p {
  margin-bottom: 8px;
}

.table-type-tag {
  padding: 2px 8px;
  margin-left: 8px;
  font-size: 12px;
  color: #1890ff;
  background-color: #e6f7ff;
  border-radius: 4px;
}

/* 解决表单设计被挤出视图的问题 */
:deep(.ant-modal-wrap) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 1000 !important;
  height: 100vh !important;
  max-height: 100vh !important;
  overflow: hidden !important;
}

:deep(.ant-modal) {
  position: relative !important;
  top: 20px !important;
  max-height: 90vh !important;
  margin: 0 auto !important;
  overflow: hidden !important;
}

:deep(.ant-modal-content) {
  position: relative !important;
  height: auto !important;
  max-height: calc(90vh - 100px) !important;
  overflow: hidden !important;
}

:deep(.ant-modal-body) {
  height: auto !important;
  max-height: calc(90vh - 160px) !important;
  padding-bottom: 20px !important; /* 减小底部填充，因为已删除底部工具栏 */
  overflow: auto !important;
}

:deep(.ant-card) {
  height: 100% !important;
  overflow: hidden !important;
}

:deep(.ant-card-body) {
  height: calc(100% - 57px) !important;
  max-height: calc(90vh - 300px) !important;
  overflow: auto !important;
}

:deep(.ant-tabs) {
  height: 100% !important;
  overflow: hidden !important;
}

:deep(.ant-tabs-content) {
  height: calc(100% - 46px) !important;
  overflow: hidden !important;
}

:deep(.ant-tabs-tabpane) {
  height: 100% !important;
  max-height: calc(90vh - 350px) !important;
  overflow: auto !important;
}

:deep(.vxe-table--main-wrapper) {
  max-height: calc(90vh - 400px) !important;
  overflow: auto !important;
}

/* 修复子表字段问题 */
:deep(.vxe-table) {
  height: auto !important;
  max-height: calc(90vh - 450px) !important;
}

:deep(.vxe-table--body-wrapper) {
  max-height: calc(90vh - 500px) !important;
  overflow-y: auto !important;
}
</style> 
