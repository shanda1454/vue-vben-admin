<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue/es/form';

import { onMounted, reactive, ref, watch } from 'vue';

// 导入主题相关
import { usePreferences } from '@vben/preferences';

import {
  CloseOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';
import {
  Button as AButton,
  Card as ACard,
  Col as ACol,
  DatePicker as ADatePicker,
  Divider as ADivider,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Modal as AModal,
  Popconfirm as APopconfirm,
  Row as ARow,
  Select as ASelect,
  SelectOption as ASelectOption,
  Space as ASpace,
  Switch as ASwitch,
  Table as ATable,
  Textarea as ATextarea,
  Upload as AUpload,
  message,
} from 'ant-design-vue';

// 导入工作流主题样式
import './styles/workflow-theme.less';

interface FormField {
  name: string;
  type: string;
  required: boolean;
}

interface FormItem {
  id: string;
  name: string;
  description: string;
  type: string;
  fields: FormField[];
  createdBy: string;
  createTime: string;
  updateTime: string;
}

// 表格列定义
const columns = [
  {
    title: '表单名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '表单类型',
    dataIndex: 'type',
    key: 'type',
    customRender: ({ text }: { text: string }) => {
      const typeMap = {
        leave: '请假申请',
        expense: '报销申请',
        purchase: '采购申请',
        custom: '自定义',
      };
      return typeMap[text as keyof typeof typeMap] || text;
    },
  },
  {
    title: '创建人',
    dataIndex: 'createdBy',
    key: 'createdBy',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
    sorter: true,
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    key: 'updateTime',
    sorter: true,
  },
  {
    title: '操作',
    key: 'action',
  },
];

// 模拟数据
const mockForms: FormItem[] = [
  {
    id: '1',
    name: '员工请假申请表',
    description: '用于员工请假申请的电子表单',
    type: 'leave',
    fields: [
      { name: '请假类型', type: 'select', required: true },
      { name: '开始日期', type: 'date', required: true },
      { name: '结束日期', type: 'date', required: true },
      { name: '请假天数', type: 'number', required: true },
      { name: '请假原因', type: 'textarea', required: true },
    ],
    createdBy: '系统管理员',
    createTime: '2023-09-01 10:00:00',
    updateTime: '2023-09-05 14:30:00',
  },
  {
    id: '2',
    name: '差旅报销申请表',
    description: '用于员工差旅费用报销的电子表单',
    type: 'expense',
    fields: [
      { name: '出差目的地', type: 'text', required: true },
      { name: '出差事由', type: 'textarea', required: true },
      { name: '出差日期', type: 'date', required: true },
      { name: '返回日期', type: 'date', required: true },
      { name: '报销金额', type: 'number', required: true },
      { name: '费用明细', type: 'textarea', required: true },
      { name: '费用凭证', type: 'file', required: true },
    ],
    createdBy: '财务主管',
    createTime: '2023-08-15 09:20:00',
    updateTime: '2023-08-20 11:45:00',
  },
];

// 状态
const loading = ref(false);
const formList = ref<FormItem[]>([]);
const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
});

// 表单实例
const formRef = ref<FormInstance>();

// 模态框状态
const modal = reactive({
  open: false,
  title: '新建表单',
  formId: '',
  mode: 'create', // create 或 edit
});

// 预览模态框状态
const previewModal = reactive({
  open: false,
  form: null as FormItem | null,
});

// 表单状态
const initialFormState = {
  name: '',
  description: '',
  type: '',
  fields: [] as FormField[],
};

const formState = reactive({ ...initialFormState });

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入表单名称' }],
  type: [{ required: true, message: '请选择表单类型' }],
};

// 容器引用
const containerRef = ref<HTMLElement | null>(null);

// 获取主题信息
const { isDark } = usePreferences();

// 监听主题变化
watch(
  () => isDark.value,
  () => {
    applyThemeStyles();
  },
);

// 应用主题样式
const applyThemeStyles = () => {
  if (!containerRef.value) return;

  // 应用暗色主题或亮色主题样式
  if (isDark.value) {
    containerRef.value.classList.add('workflow-dark-theme');
  } else {
    containerRef.value.classList.remove('workflow-dark-theme');
  }
};

// 加载表单列表
const loadFormList = async () => {
  loading.value = true;
  try {
    // 这里应该是调用API获取数据
    // 模拟API请求延迟
    await new Promise((resolve) => setTimeout(resolve, 500));
    formList.value = mockForms;
    pagination.total = mockForms.length;
  } catch (error) {
    console.error('加载表单列表失败', error);
    message.error('加载表单列表失败');
  } finally {
    loading.value = false;
  }
};

// 表格变更处理
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.current = pag.current || 1;
  pagination.pageSize = pag.pageSize || 10;
  loadFormList();
};

// 新建表单
const handleCreateForm = () => {
  modal.title = '新建表单';
  modal.mode = 'create';
  modal.formId = '';

  // 重置表单状态
  Object.assign(formState, initialFormState);

  modal.open = true;
};

// 编辑表单
const handleEditForm = (record: FormItem) => {
  modal.title = '编辑表单';
  modal.mode = 'edit';
  modal.formId = record.id;

  // 设置表单状态
  Object.assign(formState, {
    name: record.name,
    description: record.description,
    type: record.type,
    fields: [...record.fields],
  });

  modal.open = true;
};

// 删除表单
const handleDeleteForm = async (record: FormItem) => {
  loading.value = true;
  try {
    // 这里应该是调用API删除表单
    // 模拟API请求
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 更新本地数据
    formList.value = formList.value.filter((item) => item.id !== record.id);

    message.success('表单已删除');
  } catch (error) {
    console.error('删除表单失败', error);
    message.error('删除表单失败');
  } finally {
    loading.value = false;
  }
};

// 预览表单
const handlePreviewForm = (record: FormItem) => {
  previewModal.form = record;
  previewModal.open = true;
};

// 添加字段
const addField = () => {
  formState.fields.push({
    name: '',
    type: 'text',
    required: false,
  });
};

// 移除字段
const removeField = (index: number) => {
  formState.fields.splice(index, 1);
};

// 模态框确认
const handleModalOk = async () => {
  try {
    await formRef.value?.validate();

    loading.value = true;
    // 模拟API请求
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (modal.mode === 'create') {
      // 创建新表单
      const newForm: FormItem = {
        id: `${Date.now()}`,
        name: formState.name,
        description: formState.description,
        type: formState.type,
        fields: [...formState.fields],
        createdBy: '当前用户',
        createTime: new Date().toLocaleString(),
        updateTime: new Date().toLocaleString(),
      };

      formList.value.unshift(newForm);
      message.success('表单创建成功');
    } else {
      // 更新现有表单
      const index = formList.value.findIndex(
        (item) => item.id === modal.formId,
      );
      if (index !== -1) {
        formList.value[index] = {
          ...formList.value[index],
          name: formState.name,
          description: formState.description,
          type: formState.type,
          fields: [...formState.fields],
          updateTime: new Date().toLocaleString(),
        };
      }
      message.success('表单更新成功');
    }

    modal.open = false;
  } catch (error) {
    console.error('表单验证失败', error);
  } finally {
    loading.value = false;
  }
};

// 模态框取消
const handleModalCancel = () => {
  modal.open = false;
};

// 组件挂载时初始化
onMounted(() => {
  loadFormList();
  applyThemeStyles();
});
</script>

<template>
  <div class="approval-form-container" ref="containerRef">
    <ACard title="表单管理">
      <template #extra>
        <AButton type="primary" @click="handleCreateForm">
          <template #icon>
            <PlusOutlined />
          </template>
          新建表单
        </AButton>
      </template>

      <ATable
        :columns="columns"
        :data-source="formList"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <ASpace>
              <AButton
                type="primary"
                size="small"
                @click="handlePreviewForm(record)"
              >
                预览
              </AButton>
              <AButton size="small" @click="handleEditForm(record)">
                编辑
              </AButton>
              <APopconfirm
                title="确定要删除该表单吗?"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDeleteForm(record)"
              >
                <AButton danger size="small"> 删除 </AButton>
              </APopconfirm>
            </ASpace>
          </template>
        </template>
      </ATable>
    </ACard>

    <AModal
      v-model:open="modal.open"
      :title="modal.title"
      :mask-closable="false"
      :destroy-on-close="true"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
      :confirm-loading="loading"
    >
      <AForm ref="formRef" :model="formState" :rules="rules" layout="vertical">
        <AFormItem label="表单名称" name="name">
          <AInput v-model:value="formState.name" placeholder="请输入表单名称" />
        </AFormItem>
        <AFormItem label="表单描述" name="description">
          <ATextarea
            v-model:value="formState.description"
            :rows="3"
            placeholder="请输入表单描述"
          />
        </AFormItem>
        <AFormItem label="表单类型" name="type">
          <ASelect v-model:value="formState.type" placeholder="请选择表单类型">
            <ASelectOption value="leave">请假申请</ASelectOption>
            <ASelectOption value="expense">报销申请</ASelectOption>
            <ASelectOption value="purchase">采购申请</ASelectOption>
            <ASelectOption value="custom">自定义</ASelectOption>
          </ASelect>
        </AFormItem>

        <ADivider orientation="left">表单字段</ADivider>

        <div
          v-for="(field, index) in formState.fields"
          :key="index"
          class="field-item"
        >
          <ARow :gutter="16" align="middle">
            <ACol :span="8">
              <AFormItem
                label="字段名称"
                :name="['fields', index, 'name']"
                :rules="[{ required: true, message: '请输入字段名称' }]"
              >
                <AInput
                  v-model:value="field.name"
                  placeholder="请输入字段名称"
                />
              </AFormItem>
            </ACol>
            <ACol :span="7">
              <AFormItem
                label="字段类型"
                :name="['fields', index, 'type']"
                :rules="[{ required: true, message: '请选择字段类型' }]"
              >
                <ASelect
                  v-model:value="field.type"
                  placeholder="请选择字段类型"
                >
                  <ASelectOption value="text">单行文本</ASelectOption>
                  <ASelectOption value="textarea">多行文本</ASelectOption>
                  <ASelectOption value="number">数字</ASelectOption>
                  <ASelectOption value="select">下拉选择</ASelectOption>
                  <ASelectOption value="date">日期</ASelectOption>
                  <ASelectOption value="file">附件</ASelectOption>
                </ASelect>
              </AFormItem>
            </ACol>
            <ACol :span="6">
              <AFormItem label="是否必填" :name="['fields', index, 'required']">
                <ASwitch v-model:checked="field.required" />
              </AFormItem>
            </ACol>
            <ACol :span="3" class="field-actions">
              <AButton
                danger
                shape="circle"
                @click="removeField(index)"
                :disabled="formState.fields.length <= 1"
              >
                <template #icon>
                  <CloseOutlined />
                </template>
              </AButton>
            </ACol>
          </ARow>
        </div>

        <div class="add-field">
          <AButton type="dashed" block @click="addField">
            <template #icon>
              <PlusOutlined />
            </template>
            添加字段
          </AButton>
        </div>
      </AForm>
    </AModal>

    <AModal
      v-model:open="previewModal.open"
      title="表单预览"
      width="700px"
      :footer="null"
    >
      <template v-if="previewModal.form">
        <a-descriptions bordered :column="1">
          <a-descriptions-item label="表单名称">
            {{ previewModal.form.name }}
          </a-descriptions-item>
          <a-descriptions-item label="表单描述">
            {{ previewModal.form.description }}
          </a-descriptions-item>
          <a-descriptions-item label="表单类型">
            {{
              {
                leave: '请假申请',
                expense: '报销申请',
                purchase: '采购申请',
                custom: '自定义',
              }[previewModal.form.type] || previewModal.form.type
            }}
          </a-descriptions-item>
        </a-descriptions>

        <ADivider orientation="left">表单字段</ADivider>

        <div class="preview-form">
          <AForm layout="vertical">
            <template
              v-for="(field, index) in previewModal.form.fields"
              :key="index"
            >
              <AFormItem :label="field.name" :required="field.required">
                <template v-if="field.type === 'text'">
                  <AInput placeholder="请输入" disabled />
                </template>
                <template v-else-if="field.type === 'textarea'">
                  <ATextarea :rows="3" placeholder="请输入" disabled />
                </template>
                <template v-else-if="field.type === 'number'">
                  <AInputNumber
                    style="width: 100%"
                    placeholder="请输入"
                    disabled
                  />
                </template>
                <template v-else-if="field.type === 'select'">
                  <ASelect placeholder="请选择" disabled />
                </template>
                <template v-else-if="field.type === 'date'">
                  <ADatePicker style="width: 100%" disabled />
                </template>
                <template v-else-if="field.type === 'file'">
                  <AUpload>
                    <AButton disabled>
                      <template #icon>
                        <UploadOutlined />
                      </template>
                      上传文件
                    </AButton>
                  </AUpload>
                </template>
              </AFormItem>
            </template>
          </AForm>
        </div>
      </template>
    </AModal>
  </div>
</template>

<style lang="less" scoped>
.approval-form-container {
  height: 100%;
  padding: 16px;

  .field-item {
    padding: 12px;
    background-color: #fafafa;
    border-radius: 4px;
    margin-bottom: 12px;
    border: 1px dashed #d9d9d9;

    .workflow-dark-theme & {
      background-color: hsl(var(--accent-dark));
      border-color: hsl(var(--border));
    }

    .field-actions {
      display: flex;
      align-items: flex-end;
      padding-bottom: 24px;
    }
  }

  .add-field {
    margin-top: 16px;
  }

  .preview-form {
    margin-top: 16px;
    padding: 16px;
    background-color: #f5f5f5;
    border-radius: 4px;

    .workflow-dark-theme & {
      background-color: hsl(var(--accent-dark));
    }
  }
}
</style>
