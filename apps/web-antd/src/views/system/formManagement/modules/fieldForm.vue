<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { FormManagementApi } from '#/api/formManagement';
import type { OnActionClickParams, VxeTableGridOptions } from '#/adapter/vxe-table';

import { reactive, ref, onMounted, watch } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, Tabs, message } from 'ant-design-vue';

import { useVbenForm, z } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getFormDetail, updateForm } from '#/api/formManagement';
import { getDbFieldTypeOptions, useFieldColumns, useSubTableColumns } from '../data';

// 定义抽屉组件属性
const props = defineProps<{
  formId?: number;
  formName?: string;
}>();

// 定义事件
const emit = defineEmits<{
  success: [];
  cancel: [];
  register: [options: Record<string, any>];
}>();

// 表单详情数据
const formDetail = ref<FormManagementApi.FormDetail>();

// 活动标签页
const activeKey = ref('main-fields');

// 加载表单详情数据
async function loadFormDetail(formId: number | undefined) {
  try {
    if (!formId) {
      message.warning('未提供表单ID，请先创建或选择一个表单');
      return;
    }
    
    const numericId = Number(formId);
    if (isNaN(numericId) || numericId <= 0) {
      message.warning('无效的表单ID，请先创建或选择一个有效的表单');
      return;
    }

    formDetail.value = await getFormDetail(numericId);
    
    // 初始化数据
    updateGridData();
  } catch (error) {
    console.error('加载表单详情失败:', error);
    message.error('加载表单详情失败');
  }
}

// 保存表单详情
async function saveFormDetail() {
  try {
    if (!formDetail.value) {
      message.error('没有可保存的表单数据');
      return;
    }
    
    await updateForm(formDetail.value);
    message.success('保存成功');
    emit('success');
  } catch (error) {
    console.error('保存表单详情失败:', error);
    message.error('保存失败');
  }
}

// ====================== 主表字段管理 ======================
// 主表字段表格组件
const [MainFieldsGrid, mainFieldsGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useFieldColumns(onMainFieldAction),
    data: [],
    height: 'auto',
    keepSource: true,
    rowConfig: {
      keyField: 'id',
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: false,
    },
  } as VxeTableGridOptions,
});

// 主表字段操作处理
function onMainFieldAction({
  code,
  row,
}: OnActionClickParams<FormManagementApi.FormField>) {
  switch (code) {
    case 'edit': {
      openFieldForm('main', row);
      break;
    }
    case 'delete': {
      if (!formDetail.value) return;
      formDetail.value.mainFields = formDetail.value.mainFields.filter(
        (item) => item.id !== row.id,
      );
      break;
    }
    default: {
      break;
    }
  }
}

// 添加主表字段
function addMainField() {
  openFieldForm('main');
}

// ====================== 子表管理 ======================
// 子表表格组件
const [SubTablesGrid, subTablesGridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useSubTableColumns(onSubTableAction),
    data: [],
    height: 'auto',
    keepSource: true,
    rowConfig: {
      keyField: 'id',
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: false,
    },
  } as VxeTableGridOptions,
});

// 子表操作处理
function onSubTableAction({
  code,
  row,
}: OnActionClickParams<FormManagementApi.FormSubTable>) {
  switch (code) {
    case 'edit': {
      openSubTableForm(row);
      break;
    }
    case 'config': {
      activeKey.value = `table-${row.id}`;
      break;
    }
    case 'delete': {
      if (!formDetail.value) return;
      formDetail.value.subTables = formDetail.value.subTables.filter(
        (item) => item.id !== row.id,
      );
      
      // 删除相关子表字段
      if (formDetail.value.subFields[row.id]) {
        delete formDetail.value.subFields[row.id];
      }
      break;
    }
    default: {
      break;
    }
  }
}

// 添加子表
function addSubTable() {
  openSubTableForm();
}

// ====================== 字段表单弹窗 ======================
// 字段表单数据
const fieldData = reactive<Partial<FormManagementApi.FormField>>({});
const fieldMode = ref<'add' | 'edit'>('add');
const fieldType = ref<'main' | 'sub' | 'grandson'>('main');
const currentTableId = ref<number | null>(null);

// 字段表单模态窗口
const [FieldFormModal, fieldFormModalApi] = useVbenModal({
  footer: true,
  closable: false,
  onOk: async () => {
    await fieldFormApi.submitForm();
  },
  title: '字段信息',
});

// 字段表单定义
const fieldFormSchema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入数据库字段名',
    },
    fieldName: 'dbFieldName',
    label: '数据库字段名',
    rules: z
      .string()
      .min(2, '数据库字段名长度不能少于2个字符')
      .max(50, '数据库字段名长度不能超过50个字符')
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '数据库字段名必须以字母开头，只能包含字母、数字和下划线'),
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入实体字段名',
    },
    fieldName: 'entityFieldName',
    label: '实体字段名',
    rules: z
      .string()
      .min(2, '实体字段名长度不能少于2个字符')
      .max(50, '实体字段名长度不能超过50个字符')
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '实体字段名必须以字母开头，只能包含字母、数字和下划线'),
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入字段名称',
    },
    fieldName: 'fieldLabel',
    label: '字段名称',
    rules: z
      .string()
      .min(2, '字段名称长度不能少于2个字符')
      .max(50, '字段名称长度不能超过50个字符'),
  },
  {
    component: 'Select',
    componentProps: {
      options: getDbFieldTypeOptions(),
      placeholder: '请选择字段类型',
    },
    fieldName: 'fieldType',
    label: '字段类型',
    rules: 'required',
  },
  {
    component: 'Checkbox',
    fieldName: 'isViewField',
    label: '视图字段',
    renderComponentContent: () => {
      return {
        default: () => ['视图字段（不映射数据库）'],
      };
    },
  },
  {
    component: 'Checkbox',
    fieldName: 'isRequired',
    label: '必填',
    renderComponentContent: () => {
      return {
        default: () => ['不能为空'],
      };
    },
  },
  {
    component: 'Checkbox',
    dependencies: {
      show: (values) => {
        return (
          ['Int', 'BigInt', 'Decimal', 'Float', 'Double'].includes(
            values.fieldType,
          ) && !values.isViewField
        );
      },
      triggerFields: ['fieldType', 'isViewField'],
    },
    fieldName: 'nonNegative',
    label: '数值验证',
    renderComponentContent: () => {
      return {
        default: () => ['不能为负数'],
      };
    },
  },
  {
    component: 'Checkbox',
    dependencies: {
      show: (values) => {
        return (
          ['Int', 'BigInt', 'Decimal', 'Float', 'Double'].includes(
            values.fieldType,
          ) && !values.isViewField
        );
      },
      triggerFields: ['fieldType', 'isViewField'],
    },
    fieldName: 'nonZero',
    label: '',
    renderComponentContent: () => {
      return {
        default: () => ['不能为零'],
      };
    },
  },
  {
    component: 'Checkbox',
    dependencies: {
      show: (values) => {
        return (
          ['Int', 'BigInt', 'Decimal', 'Float', 'Double', 'Bit', 'Boolean'].includes(
            values.fieldType,
          )
        );
      },
      triggerFields: ['fieldType'],
    },
    fieldName: 'isCheckboxStyle',
    label: '控件样式',
    renderComponentContent: () => {
      return {
        default: () => ['勾选样式'],
      };
    },
  },
  {
    component: 'Checkbox',
    dependencies: {
      show: (values) => {
        return (
          ['Int', 'BigInt', 'Decimal', 'Float', 'Double'].includes(
            values.fieldType,
          )
        );
      },
      triggerFields: ['fieldType'],
    },
    fieldName: 'isPercentageStyle',
    label: '',
    renderComponentContent: () => {
      return {
        default: () => ['百分比样式'],
      };
    },
  },
  {
    component: 'Input',
    fieldName: 'defaultValue',
    label: '默认值',
  },
];

// 创建字段表单组件
const [FieldForm, fieldFormApi] = useVbenForm({
  handleSubmit: (values) => {
    if (!formDetail.value) return;
    
    const newField: FormManagementApi.FormField = {
      ...values,
      formId: formDetail.value.id,
      id: fieldMode.value === 'edit' ? fieldData.id! : Date.now(),
      orderNo: fieldData.orderNo || formDetail.value.mainFields.length + 1,
      tableId: currentTableId.value || undefined,
      tableType: fieldType.value,
    };
    
    if (fieldType.value === 'main') {
      if (fieldMode.value === 'edit') {
        const index = formDetail.value.mainFields.findIndex(
          (item) => item.id === newField.id,
        );
        if (index !== -1) {
          formDetail.value.mainFields[index] = newField;
        }
      } else {
        formDetail.value.mainFields.push(newField);
      }
    } else {
      if (!currentTableId.value) return;
      
      if (!formDetail.value.subFields[currentTableId.value]) {
        formDetail.value.subFields[currentTableId.value] = [];
      }
      
      if (fieldMode.value === 'edit') {
        const index = formDetail.value.subFields[currentTableId.value].findIndex(
          (item) => item.id === newField.id,
        );
        if (index !== -1) {
          formDetail.value.subFields[currentTableId.value][index] = newField;
        }
      } else {
        formDetail.value.subFields[currentTableId.value].push(newField);
      }
    }
    
    fieldFormModalApi.close();
    updateGridData();
  },
  layout: 'vertical',
  schema: fieldFormSchema,
});

// 打开字段表单
function openFieldForm(
  type: 'main' | 'sub' | 'grandson',
  field?: FormManagementApi.FormField,
  tableId?: number,
) {
  fieldType.value = type;
  fieldMode.value = field ? 'edit' : 'add';
  currentTableId.value = tableId || null;
  
  const title = field
    ? '编辑字段'
    : `添加${type === 'main' ? '主表' : type === 'sub' ? '子表' : '孙表'}字段`;
  
  fieldFormModalApi.setState({ title });
  
  if (field) {
    Object.assign(fieldData, field);
    fieldFormApi.setValues(field);
  } else {
    Object.assign(fieldData, {
      dbFieldName: '',
      entityFieldName: '',
      fieldLabel: '',
      fieldType: 'VarChar',
      isCheckboxStyle: false,
      isPercentageStyle: false,
      isRequired: false,
      isViewField: false,
      nonNegative: false,
      nonZero: false,
    });
    fieldFormApi.setValues(fieldData);
  }
  
  fieldFormModalApi.open();
}

// ====================== 子表表单弹窗 ======================
// 子表表单数据
const subTableData = reactive<Partial<FormManagementApi.FormSubTable>>({});
const subTableMode = ref<'add' | 'edit'>('add');

// 子表表单模态窗口
const [SubTableFormModal, subTableFormModalApi] = useVbenModal({
  footer: true,
  closable: false,
  onOk: async () => {
    await subTableFormApi.submitForm();
  },
  title: '子表信息',
});

// 子表表单定义
const subTableFormSchema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入子表标题',
    },
    fieldName: 'tableTitle',
    label: '表标题',
    rules: z
      .string()
      .min(2, '表标题长度不能少于2个字符')
      .max(50, '表标题长度不能超过50个字符'),
  },
  {
    component: 'RadioGroup',
    componentProps: {
      buttonStyle: 'solid',
      options: [
        { label: '子表', value: 'sub' },
        { label: '孙表', value: 'grandson' },
      ],
      optionType: 'button',
    },
    defaultValue: 'sub',
    fieldName: 'tableType',
    label: '表类型',
  },
  {
    component: 'Select',
    componentProps() {
      return {
        options: formDetail.value?.subTables
          .filter((table) => table.tableType === 'sub')
          .map((table) => ({
            label: table.tableTitle,
            value: table.id,
          })) || [],
        placeholder: '请选择父表',
      };
    },
    dependencies: {
      show: (values) => values.tableType === 'grandson',
      triggerFields: ['tableType'],
    },
    fieldName: 'parentTableId',
    label: '父表',
    rules: (values) => (values.tableType === 'grandson' ? 'required' : null),
  },
  {
    component: 'Input',
    componentProps: {
      disabled: subTableMode.value === 'edit',
      placeholder: '请输入表名',
    },
    fieldName: 'tableName',
    label: '表名',
    rules: z
      .string()
      .min(2, '表名长度不能少于2个字符')
      .max(50, '表名长度不能超过50个字符')
      .regex(/^[a-zA-Z0-9_]+$/, '表名只能包含字母、数字和下划线'),
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入表后缀',
    },
    fieldName: 'tableSuffix',
    label: '表后缀',
    rules: z
      .string()
      .min(1, '表后缀不能为空')
      .max(10, '表后缀长度不能超过10个字符')
      .regex(/^[a-zA-Z0-9_]+$/, '表后缀只能包含字母、数字和下划线'),
  },
];

// 创建子表表单组件
const [SubTableForm, subTableFormApi] = useVbenForm({
  handleSubmit: (values) => {
    if (!formDetail.value) return;
    
    const newSubTable: FormManagementApi.FormSubTable = {
      ...values,
      formId: formDetail.value.id,
      id: subTableMode.value === 'edit' ? subTableData.id! : Date.now(),
      orderNo: subTableData.orderNo || formDetail.value.subTables.length + 1,
    };
    
    if (subTableMode.value === 'edit') {
      const index = formDetail.value.subTables.findIndex(
        (item) => item.id === newSubTable.id,
      );
      if (index !== -1) {
        formDetail.value.subTables[index] = newSubTable;
      }
    } else {
      formDetail.value.subTables.push(newSubTable);
      
      // 初始化子表字段映射
      if (!formDetail.value.subFields[newSubTable.id]) {
        formDetail.value.subFields[newSubTable.id] = [];
      }
    }
    
    subTableFormModalApi.close();
    updateGridData();
    
    // 创建后直接跳转到字段配置
    if (subTableMode.value === 'add') {
      activeKey.value = `table-${newSubTable.id}`;
    }
  },
  layout: 'vertical',
  schema: subTableFormSchema,
});

// 打开子表表单
function openSubTableForm(subTable?: FormManagementApi.FormSubTable) {
  subTableMode.value = subTable ? 'edit' : 'add';
  
  const title = subTable ? '编辑子表' : '添加子表/孙表';
  subTableFormModalApi.setState({ title });
  
  if (subTable) {
    Object.assign(subTableData, subTable);
    subTableFormApi.setValues(subTable);
  } else {
    const mainTable = formDetail.value?.tableName || '';
    const defaultSuffix = mainTable ? 'B' : '';
    
    Object.assign(subTableData, {
      formId: formDetail.value?.id,
      parentTableId: undefined,
      tableName: mainTable.replace('_H', '_B'),
      tableSuffix: defaultSuffix,
      tableTitle: '',
      tableType: 'sub',
    });
    subTableFormApi.setValues(subTableData);
  }
  
  subTableFormModalApi.open();
}

// 更新表格数据
function updateGridData() {
  if (!formDetail.value) return;
  
  mainFieldsGridApi.setGridOptions({
    data: formDetail.value.mainFields,
  });
  
  subTablesGridApi.setGridOptions({
    data: formDetail.value.subTables,
  });
}

// ====================== 子表字段表格 ======================
const subTableFieldsGrids = ref<Record<number, any>>({});

// 获取子表字段表格
function getSubTableFieldsGrid(tableId: number) {
  if (!subTableFieldsGrids.value[tableId]) {
    const [grid, api] = useVbenVxeGrid({
      gridOptions: {
        columns: useFieldColumns((params) => onSubTableFieldAction(tableId, params)),
        data: formDetail.value?.subFields[tableId] || [],
        height: 'auto',
        keepSource: true,
        rowConfig: {
          keyField: 'id',
        },
        toolbarConfig: {
          custom: true,
          export: false,
          refresh: false,
        },
      } as VxeTableGridOptions,
    });
    
    subTableFieldsGrids.value[tableId] = { grid, api };
  }
  
  return subTableFieldsGrids.value[tableId];
}

// 子表字段操作处理
function onSubTableFieldAction(tableId: number, {
  code,
  row,
}: OnActionClickParams<FormManagementApi.FormField>) {
  if (!formDetail.value) return;
  
  const subTable = formDetail.value.subTables.find((t) => t.id === tableId);
  if (!subTable) return;
  
  switch (code) {
    case 'edit': {
      openFieldForm(
        subTable.tableType,
        row,
        tableId,
      );
      break;
    }
    case 'delete': {
      if (!formDetail.value.subFields[tableId]) return;
      
      formDetail.value.subFields[tableId] = formDetail.value.subFields[tableId].filter(
        (item) => item.id !== row.id,
      );
      
      const { api } = getSubTableFieldsGrid(tableId);
      api.setGridOptions({
        data: formDetail.value.subFields[tableId],
      });
      break;
    }
    default: {
      break;
    }
  }
}

// 添加子表字段
function addSubTableField(tableId: number) {
  if (!formDetail.value) return;
  
  const subTable = formDetail.value.subTables.find((t) => t.id === tableId);
  if (!subTable) return;
  
  openFieldForm(subTable.tableType, undefined, tableId);
}

// 更新子表字段表格数据
function updateSubTableFieldsGrid(tableId: number) {
  if (!formDetail.value || !formDetail.value.subFields[tableId]) return;
  
  const { api } = getSubTableFieldsGrid(tableId);
  api.setGridOptions({
    data: formDetail.value.subFields[tableId],
  });
}

// 在组件挂载后加载表单详情
onMounted(() => {
  if (props.formId) {
    loadFormDetail(props.formId);
  } else {
    message.warning('未提供表单ID，请先创建或选择一个表单');
  }
});

// 监听formId变化，当formId变化时重新加载表单详情
watch(() => props.formId, (newVal) => {
  if (newVal) {
    loadFormDetail(newVal);
  }
});
</script>

<template>
  <div class="p-4">
    <div class="mb-4 flex justify-end">
      <Button type="primary" @click="saveFormDetail">保存</Button>
    </div>
    
    <Tabs v-model:activeKey="activeKey">
      <!-- 主表字段 -->
      <Tabs.TabPane key="main-fields" tab="主表字段">
        <MainFieldsGrid>
          <template #toolbar-tools>
            <Button type="primary" @click="addMainField">
              <Plus class="size-5" />
              添加字段
            </Button>
          </template>
        </MainFieldsGrid>
      </Tabs.TabPane>
      
      <!-- 子表管理 -->
      <Tabs.TabPane key="sub-tables" tab="子表管理">
        <SubTablesGrid>
          <template #toolbar-tools>
            <Button type="primary" @click="addSubTable">
              <Plus class="size-5" />
              添加子表
            </Button>
          </template>
        </SubTablesGrid>
      </Tabs.TabPane>
      
      <!-- 子表字段管理（动态标签页） -->
      <Tabs.TabPane
        v-for="subTable in formDetail?.subTables"
        :key="`table-${subTable.id}`"
        :tab="`${subTable.tableTitle} 字段`"
      >
        <component :is="getSubTableFieldsGrid(subTable.id).grid">
          <template #toolbar-tools>
            <Button type="primary" @click="addSubTableField(subTable.id)">
              <Plus class="size-5" />
              添加字段
            </Button>
          </template>
        </component>
      </Tabs.TabPane>
    </Tabs>
    
    <!-- 字段表单模态窗 -->
    <FieldFormModal>
      <FieldForm />
    </FieldFormModal>
    
    <!-- 子表表单模态窗 -->
    <SubTableFormModal>
      <SubTableForm />
    </SubTableFormModal>
  </div>
</template> 
