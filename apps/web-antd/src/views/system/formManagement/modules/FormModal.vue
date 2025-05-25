<script lang="ts" setup>
import type { FormManagementApi } from '#/api/formManagement';
import type { FormInstance, Rule as RuleObject } from 'ant-design-vue/es/form';

import { computed, ref, reactive, watch } from 'vue';
import { Modal, Form, Input, Select, Tooltip, Space, Alert } from 'ant-design-vue';
import { InfoCircleOutlined } from '@ant-design/icons-vue';
import { 
  createForm, 
  updateForm, 
  checkFormName, 
  checkTableName
} from '#/api/formManagement';
import { getModuleOptions } from '../data';

const props = defineProps<{
  visible: boolean;
  title?: string;
  formData?: Partial<FormManagementApi.FormBase>;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'success': [];
}>();

// 表单数据
const formState = reactive<Partial<FormManagementApi.FormBase>>({
  formName: '',
  module: '',
  tableName: '',
  description: '',
});

// 表单引用
const formRef = ref();
const confirmLoading = ref(false);

// 是否是编辑模式
const isEdit = computed(() => Boolean(formState.id));

// 监听表单名称变化时自动生成表名
watch(() => formState.formName, (newVal) => {
  if (!isEdit.value && newVal && !formState.tableName) {
    formState.module = formState.module || '业务';
    // 将表单名称转换为简单格式
    const nameInPinyin = newVal;
    formState.tableName = `Base_${nameInPinyin}_H`;
  }
});

// 重置表单
const resetForm = () => {
  formState.formName = '';
  formState.module = '';
  formState.tableName = '';
  formState.description = '';
  formState.id = undefined;
};

// 监听visible变化
watch(() => props.visible, (visible) => {
  if (!visible) {
    resetForm();
  }
}, { immediate: true });

// 监听props变化
watch(() => props.formData, (newData) => {
  if (newData) {
    // 复制属性到formState
    Object.keys(formState).forEach(key => {
      if (key in newData) {
        // @ts-ignore
        formState[key] = newData[key];
      }
    });
  } else {
    // 重置表单
    resetForm();
  }
}, { immediate: true, deep: true });

// 计算子表默认命名
const subTableName = computed(() => {
  if (!formState.tableName) return '';
  const baseName = formState.tableName.replace('_H', '');
  return `${baseName}_B`;
});

// 计算孙表默认命名
const grandsonTableName = computed(() => {
  if (!formState.tableName) return '';
  const baseName = formState.tableName.replace('_H', '');
  return `${baseName}_B_S`;
});

// 处理确认
const handleOk = async () => {
  try {
    await formRef.value.validate();
    confirmLoading.value = true;
    
    if (isEdit.value) {
      await updateForm({
        ...formState,
        id: formState.id,
      });
    } else {
      await createForm(formState);
    }
    
    // 关闭弹窗
    emit('update:visible', false);
    // 通知成功
    emit('success');
  } catch (error) {
    console.error('保存表单失败:', error);
  } finally {
    confirmLoading.value = false;
  }
};

// 处理取消
const handleCancel = () => {
  emit('update:visible', false);
};

// 自定义验证函数
const validateFormName = async (rule: any, value: string) => {
  if (!value) {
    return Promise.reject('请输入表单名称');
  }
  const exists = await checkFormName(value, formState.id);
  if (exists) {
    return Promise.reject('表单名称已存在');
  }
  return Promise.resolve();
};

async function validateTableName(rule: any, value: string) {
  if (!value) {
    return Promise.reject('请输入表名');
  }
  const exists = await checkTableName(value, formState.id);
  if (exists) {
    return Promise.reject('表名已存在');
  }
  return Promise.resolve();
}

// 表单校验规则
const rules: Record<string, RuleObject[]> = {
  formName: [{ validator: validateFormName, trigger: 'blur' }],
  module: [{ required: true, message: '请选择所属模块', trigger: 'change' }],
  tableName: [{ validator: validateTableName, trigger: 'blur' }],
};
</script>

<template>
  <Modal
    :title="props.title || (isEdit ? '编辑表单' : '创建表单')"
    :open="props.visible"
    :confirm-loading="confirmLoading"
    @update:open="(val) => emit('update:visible', val)"
    @ok="handleOk"
    @cancel="handleCancel"
    :maskClosable="false"
    :destroyOnClose="true"
    :width="600"
  >
    <Alert
      v-if="!isEdit"
      message="表单创建提示"
      description="创建表单后，您可以维护表单字段，并可以添加子表/孙表结构"
      type="info"
      show-icon
      class="mb-4"
    />
    
    <Form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      name="formManagementForm"
    >
      <Form.Item name="formName" label="表单名称">
        <Input 
          v-model:value="formState.formName" 
          placeholder="请输入表单名称" 
          allow-clear
        />
      </Form.Item>
      
      <Form.Item name="module" label="所属模块">
        <Select
          v-model:value="formState.module"
          :options="getModuleOptions()"
          placeholder="请选择所属模块"
          allowClear
        />
      </Form.Item>
      
      <Form.Item 
        name="tableName" 
        label="数据表名" 
        extra="主表数据表命名格式是 Base_表名_H"
      >
        <Input 
          v-model:value="formState.tableName" 
          placeholder="请输入数据表名" 
          allow-clear
        />
      </Form.Item>
      
      <div v-if="formState.tableName && !isEdit" class="mb-4">
        <Space direction="vertical" style="width: 100%">
          <div class="text-gray-500">
            <span>子表表名: </span>
            <span class="text-primary">{{ subTableName }}</span>
            <Tooltip title="子表可能存在多个，创建后可修改子表后缀">
              <InfoCircleOutlined class="ml-1" />
            </Tooltip>
          </div>
          <div class="text-gray-500">
            <span>孙表表名: </span>
            <span class="text-primary">{{ grandsonTableName }}</span>
            <Tooltip title="孙表可能存在多个，创建后可修改孙表后缀">
              <InfoCircleOutlined class="ml-1" />
            </Tooltip>
          </div>
        </Space>
      </div>
      
      <Form.Item name="description" label="描述">
        <Input.TextArea
          v-model:value="formState.description"
          placeholder="请输入表单描述"
          :rows="4"
        />
      </Form.Item>
    </Form>
  </Modal>
</template>

<style scoped>
.text-primary {
  color: #1890ff;
}

.text-gray-500 {
  color: #8c8c8c;
}

.mb-4 {
  margin-bottom: 16px;
}

.ml-1 {
  margin-left: 4px;
}
</style> 
