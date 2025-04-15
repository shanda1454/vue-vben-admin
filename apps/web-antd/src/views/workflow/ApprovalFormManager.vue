<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue/es/form';

import { onMounted, reactive, ref, watch } from 'vue';

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
  message,
  Modal as AModal,
  Popconfirm as APopconfirm,
  Row as ARow,
  Select as ASelect,
  SelectOption as ASelectOption,
  Space as ASpace,
  Switch as ASwitch,
  Table as ATable,
  Textarea as ATextarea,
  Upload as AUpload
} from 'ant-design-vue';

// 导入主题相关
import { preferences, usePreferences } from '@vben/preferences';

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
    customRender: ({ text }) => {
      const typeMap = {
        leave: '请假申请',
        expense: '报销申请',
        purchase: '采购申请',
        custom: '自定义',
      };
      return typeMap[text] || text;
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
  }
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
    <a-card title="表单管理">
      <template #extra>
        <a-button type="primary" @click="handleCreateForm">
          <template #icon>
            <PlusOutlined />
          </template>
          新建表单
        </a-button>
      </template>

      <a-table
        :columns="columns"
        :data-source="formList"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="primary" size="small" @click="handlePreviewForm(record)">
                预览
              </a-button>
              <a-button size="small" @click="handleEditForm(record)">
                编辑
              </a-button>
              <a-popconfirm
                title="确定要删除该表单吗?"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDeleteForm(record)"
              >
                <a-button danger size="small">
                  删除
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="modal.open"
      :title="modal.title"
      :maskClosable="false"
      :destroyOnClose="true"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
      :confirmLoading="loading"
    >
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
      >
        <a-form-item label="表单名称" name="name">
          <a-input v-model:value="formState.name" placeholder="请输入表单名称" />
        </a-form-item>
        <a-form-item label="表单描述" name="description">
          <a-textarea v-model:value="formState.description" :rows="3" placeholder="请输入表单描述" />
        </a-form-item>
        <a-form-item label="表单类型" name="type">
          <a-select v-model:value="formState.type" placeholder="请选择表单类型">
            <a-select-option value="leave">请假申请</a-select-option>
            <a-select-option value="expense">报销申请</a-select-option>
            <a-select-option value="purchase">采购申请</a-select-option>
            <a-select-option value="custom">自定义</a-select-option>
          </a-select>
        </a-form-item>

        <a-divider orientation="left">表单字段</a-divider>
        
        <div v-for="(field, index) in formState.fields" :key="index" class="field-item">
          <a-row :gutter="16" align="middle">
            <a-col :span="8">
              <a-form-item
                label="字段名称"
                :name="['fields', index, 'name']"
                :rules="[{ required: true, message: '请输入字段名称' }]"
              >
                <a-input v-model:value="field.name" placeholder="请输入字段名称" />
              </a-form-item>
            </a-col>
            <a-col :span="7">
              <a-form-item
                label="字段类型"
                :name="['fields', index, 'type']"
                :rules="[{ required: true, message: '请选择字段类型' }]"
              >
                <a-select v-model:value="field.type" placeholder="请选择字段类型">
                  <a-select-option value="text">单行文本</a-select-option>
                  <a-select-option value="textarea">多行文本</a-select-option>
                  <a-select-option value="number">数字</a-select-option>
                  <a-select-option value="select">下拉选择</a-select-option>
                  <a-select-option value="date">日期</a-select-option>
                  <a-select-option value="file">附件</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="是否必填" :name="['fields', index, 'required']">
                <a-switch v-model:checked="field.required" />
              </a-form-item>
            </a-col>
            <a-col :span="3" class="field-actions">
              <a-button
                danger
                shape="circle"
                @click="removeField(index)"
                :disabled="formState.fields.length <= 1"
              >
                <template #icon>
                  <CloseOutlined />
                </template>
              </a-button>
            </a-col>
          </a-row>
        </div>

        <div class="add-field">
          <a-button type="dashed" block @click="addField">
            <template #icon>
              <PlusOutlined />
            </template>
            添加字段
          </a-button>
        </div>
      </a-form>
    </a-modal>

    <a-modal
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
                custom: '自定义'
              }[previewModal.form.type] || previewModal.form.type 
            }}
          </a-descriptions-item>
        </a-descriptions>

        <a-divider orientation="left">表单字段</a-divider>
        
        <div class="preview-form">
          <a-form layout="vertical">
            <template v-for="(field, index) in previewModal.form.fields" :key="index">
              <a-form-item
                :label="field.name"
                :required="field.required"
              >
                <template v-if="field.type === 'text'">
                  <a-input placeholder="请输入" disabled />
                </template>
                <template v-else-if="field.type === 'textarea'">
                  <a-textarea :rows="3" placeholder="请输入" disabled />
                </template>
                <template v-else-if="field.type === 'number'">
                  <a-input-number style="width: 100%" placeholder="请输入" disabled />
                </template>
                <template v-else-if="field.type === 'select'">
                  <a-select placeholder="请选择" disabled />
                </template>
                <template v-else-if="field.type === 'date'">
                  <a-date-picker style="width: 100%" disabled />
                </template>
                <template v-else-if="field.type === 'file'">
                  <a-upload>
                    <a-button disabled>
                      <template #icon>
                        <UploadOutlined />
                      </template>
                      上传文件
                    </a-button>
                  </a-upload>
                </template>
              </a-form-item>
            </template>
          </a-form>
        </div>
      </template>
    </a-modal>
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
