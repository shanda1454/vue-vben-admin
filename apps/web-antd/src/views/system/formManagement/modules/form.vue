<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { FormManagementApi } from '#/api/formManagement';

import { computed, ref, watch } from 'vue';

import { z } from '#/adapter/form';
import { useVbenForm } from '#/adapter/form';
import { 
  getFormList,
  getFormDetail,
  createForm,
  updateForm,
  deleteForm,
  checkFormName,
  checkTableName,
} from '#/api/formManagement';
import { getModuleOptions } from '../data';

// 引入ant-design-vue的Input组件
import { Input, Textarea } from 'ant-design-vue';

const emit = defineEmits<{
  success: [];
  cancel: [];
  register: [options: Record<string, any>];
}>();

const props = defineProps<{
  data?: Partial<FormManagementApi.FormBase>;
}>();

const formData = ref<Partial<FormManagementApi.FormBase>>(props.data || {});
const isEdit = computed(() => Boolean(formData.value?.id));
const tableName = ref('');

// 当表单名称变化时，自动生成默认的表名
watch(() => formData.value.formName, (newVal) => {
  if (!isEdit.value && newVal && !tableName.value) {
    formData.value.module = formData.value.module || '业务';
    // 将表单名称转换为拼音首字母或英文，实际项目中可能需要更复杂的逻辑
    const nameInPinyin = newVal;
    tableName.value = `Base_${nameInPinyin}_H`;
    formData.value.tableName = tableName.value;
  }
});

// 表单字段定义
const formSchema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入表单名称',
    },
    fieldName: 'formName',
    label: '表单名称',
    rules: z
      .string()
      .min(2, '表单名称长度不能少于2个字符')
      .max(50, '表单名称长度不能超过50个字符')
      .refine(
        async (value) => {
          if (!value || value.trim() === '') {
            return false;
          }
          return !(await checkFormName(value, formData.value?.id));
        },
        (value) => ({
          message: value ? `表单名称 "${value}" 已存在` : '表单名称不能为空',
        }),
      ),
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: getModuleOptions(),
      placeholder: '请选择所属模块',
    },
    fieldName: 'module',
    label: '所属模块',
    rules: 'required',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入数据表名',
    },
    fieldName: 'tableName',
    label: '数据表名',
    rules: z
      .string()
      .min(2, '数据表名长度不能少于2个字符')
      .max(50, '数据表名长度不能超过50个字符')
      .regex(/^[a-zA-Z0-9_]+$/, '数据表名只能包含字母、数字和下划线')
      .refine(
        async (value) => {
          if (!value || value.trim() === '') {
            return false;
          }
          return !(await checkTableName(value, formData.value?.id));
        },
        (value) => ({
          message: value ? `数据表名 "${value}" 已存在` : '数据表名不能为空',
        }),
      ),
  },
  {
    component: 'Textarea',
    componentProps: {
      placeholder: '请输入表单描述',
      rows: 4,
    },
    fieldName: 'description',
    label: '描述',
  },
];

// 创建表单组件
const [BaseForm, formApi] = useVbenForm({
  handleSubmit: async () => {
    try {
      const values = await formApi.getValues<Partial<FormManagementApi.FormDetail>>();
      if (isEdit.value) {
        await updateForm({
          ...values,
          id: formData.value.id,
        });
      } else {
        await createForm(values);
      }
      emit('success');
    } catch (error) {
      console.error('保存表单失败:', error);
      return Promise.reject(error);
    }
  },
  layout: 'vertical',
  schema: formSchema,
});

// 初始化表单数据
watch(
  () => props.data,
  (newVal) => {
    formData.value = newVal || {};
    if (newVal) {
      formApi.setValues(newVal);
      tableName.value = newVal.tableName || '';
    }
  },
  { immediate: true, deep: true },
);

async function validateFormName(rule: any, value: string) {
  if (!value) {
    return Promise.reject('请输入表单名称');
  }
  return !(await checkFormName(value, formData.value?.id));
}

async function validateTableName(rule: any, value: string) {
  if (!value) {
    return Promise.reject('请输入表名');
  }
  return !(await checkTableName(value, formData.value?.id));
}
</script>

<template>
  <div>
    <BaseForm />
  </div>
</template> 
