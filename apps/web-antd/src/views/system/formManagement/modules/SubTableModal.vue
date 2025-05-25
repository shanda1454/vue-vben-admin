<script lang="ts" setup>
import { ref, watch, reactive } from 'vue';
import { Modal, Form, Input, Select, Alert } from 'ant-design-vue';
import type { FormManagementApi } from '#/api/formManagement';

// 组件属性
const props = defineProps<{
  open: boolean;
  tableData: Partial<FormManagementApi.FormSubTable> | null;
  formId?: number;  // 表单ID
  formName?: string; // 表单名称
  mainTableName?: string; // 主表表名
}>();

// 组件事件
const emit = defineEmits(['update:open', 'save']);

// 表单实例引用
const formRef = ref();
const confirmLoading = ref(false);

// 表单状态
const formState = reactive<Partial<FormManagementApi.FormSubTable>>({
  id: undefined,
  formId: props.formId,
  tableTitle: '',       // 表标题
  tableName: '',        // 表名
  tableSuffix: '',      // 表后缀
  tableType: 'sub',     // 表类型：sub(子表) 或 grandson(孙表)
  parentTableId: undefined, // 父表ID，子表的父表是主表，孙表的父表是子表
  description: '',      // 描述
  relationField: '',    // 关联字段
});

// 是否为编辑模式
const isEdit = ref(false);
const title = ref('新增子表');

// 计算属性：默认表名
const defaultTableName = computed(() => {
  if (!props.mainTableName) return '';
  
  const baseTableName = props.mainTableName.replace('_H', '');
  if (formState.tableType === 'sub') {
    // 子表默认命名：Base_表名_B
    return `${baseTableName}_B${formState.tableSuffix ? `_${formState.tableSuffix}` : ''}`;
  } else {
    // 孙表默认命名：Base_表名_B_S
    return `${baseTableName}_B_S${formState.tableSuffix ? `_${formState.tableSuffix}` : ''}`;
  }
});

// 子表类型选项
const tableTypeOptions = [
  { label: '子表', value: 'sub' },
  { label: '孙表', value: 'grandson' }
];

// 表单验证规则
const rules = {
  tableTitle: [
    { required: true, message: '请输入表标题', trigger: 'blur' }
  ],
  tableName: [
    { required: true, message: '请输入表名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '表名只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  tableType: [
    { required: true, message: '请选择表类型', trigger: 'change' }
  ]
};

// 监听表标题变化，自动生成表后缀
watch(() => formState.tableTitle, (val) => {
  if (!isEdit.value && val && !formState.tableSuffix) {
    // 简单使用标题的首字母作为后缀
    formState.tableSuffix = val.charAt(0).toUpperCase() + val.charAt(1).toUpperCase();
  }
});

// 监听表类型变化，更新表名
watch([() => formState.tableType, () => formState.tableSuffix], () => {
  if (!isEdit.value) {
    formState.tableName = defaultTableName.value;
  }
});

// 监听子表数据变化
watch(() => props.tableData, (val) => {
  if (val) {
    // 编辑模式
    isEdit.value = true;
    title.value = `编辑${val.tableType === 'sub' ? '子' : '孙'}表 - ${val.tableTitle || ''}`;
    
    // 复制所有属性
    Object.keys(val).forEach(key => {
      if (key in formState) {
        // @ts-ignore
        formState[key] = val[key];
      }
    });
    
    // 确保必要的字段被设置
    formState.formId = props.formId;
  } else {
    // 新增模式
    isEdit.value = false;
    title.value = '新增子表/孙表';
    // 重置表单
    resetForm();
  }
}, { immediate: true });

// 重置表单
function resetForm() {
  Object.assign(formState, {
    id: undefined,
    formId: props.formId,
    tableTitle: '',
    tableName: '',
    tableSuffix: '',
    tableType: 'sub',
    parentTableId: undefined,
    description: '',
    relationField: '',
  });
}

// 提交表单
async function handleOk() {
  try {
    confirmLoading.value = true;
    
    // 表单验证
    await formRef.value.validate();
    
    // 确保表名已设置
    if (!formState.tableName) {
      formState.tableName = defaultTableName.value;
    }
    
    // 提交数据
    emit('save', { ...formState });
    
    // 关闭弹窗
    emit('update:open', false);
  } catch (error) {
    console.error('表单验证失败:', error);
  } finally {
    confirmLoading.value = false;
  }
}

// 取消操作
function handleCancel() {
  emit('update:open', false);
}

import { computed } from 'vue';
</script>

<template>
  <Modal
    :open="props.open"
    :title="title"
    :width="600"
    :maskClosable="false"
    :destroyOnClose="true"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <Alert
      :message="`为表单 [${props.formName || ''}] 添加子表/孙表`"
      :description="isEdit ? '编辑子表信息' : '添加新的子表或孙表，完成后可以为子表配置字段'"
      type="info"
      show-icon
      class="mb-4"
    />
    
    <Form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      name="subTableForm"
    >
      <Form.Item name="tableTitle" label="表标题">
        <Input 
          v-model:value="formState.tableTitle" 
          placeholder="如: 订单明细" 
          allow-clear
        />
      </Form.Item>
      
      <Form.Item name="tableType" label="表类型">
        <Select 
          v-model:value="formState.tableType" 
          :options="tableTypeOptions"
          :disabled="isEdit"
        />
      </Form.Item>
      
      <Form.Item name="tableSuffix" label="表后缀" help="可选，用于区分多个子表">
        <Input 
          v-model:value="formState.tableSuffix" 
          placeholder="如: A, B, C..." 
          allow-clear
        />
      </Form.Item>
      
      <Form.Item name="tableName" label="完整表名">
        <Input 
          v-model:value="formState.tableName" 
          :placeholder="defaultTableName"
          :disabled="isEdit"
        />
      </Form.Item>
      
      <Form.Item name="description" label="描述">
        <Input.TextArea 
          v-model:value="formState.description" 
          placeholder="表的详细描述"
          :rows="3"
        />
      </Form.Item>
    </Form>
  </Modal>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}
</style> 
