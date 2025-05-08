<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue';

import { h, onMounted, reactive, ref, watch } from 'vue';

// 导入主题相关
import { usePreferences } from '@vben/preferences';

import {
  Button as AButton,
  Card as ACard,
  Form as AForm,
  FormItem as AFormItem,
  Modal as AModal,
  Space as ASpace,
  Table as ATable,
  Textarea as ATextarea,
  Badge,
  message,
} from 'ant-design-vue';

// 导入工作流主题样式
import './styles/workflow-theme.less';

interface TaskItem {
  id: string;
  title: string;
  processName: string;
  assignee: string;
  createTime: string;
  priority: number;
  status: string;
}

// 表格列定义
const columns = [
  {
    title: '任务名称',
    dataIndex: 'title',
    key: 'title',
  },
  {
    title: '流程名称',
    dataIndex: 'processName',
    key: 'processName',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
    sorter: true,
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    sorter: true,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    customRender: ({ text }: { text: string }) => {
      switch (text) {
        case 'approved': {
          return h(Badge, { status: 'success', text: '已同意' });
        }
        case 'pending': {
          return h(Badge, { status: 'processing', text: '待处理' });
        }
        case 'rejected': {
          return h(Badge, { status: 'error', text: '已拒绝' });
        }
        // No default
      }
      return text;
    },
  },
  {
    title: '操作',
    key: 'action',
  },
];

// 模拟数据
const mockTasks: TaskItem[] = [
  {
    id: '1',
    title: '请假审批',
    processName: '员工请假流程',
    assignee: '张经理',
    createTime: '2023-10-15 14:30:00',
    priority: 3,
    status: 'pending',
  },
  {
    id: '2',
    title: '报销审批',
    processName: '费用报销流程',
    assignee: '财务主管',
    createTime: '2023-10-14 10:15:00',
    priority: 2,
    status: 'pending',
  },
  {
    id: '3',
    title: '采购申请',
    processName: '物资采购流程',
    assignee: '采购经理',
    createTime: '2023-10-12 16:45:00',
    priority: 1,
    status: 'pending',
  },
];

// 状态
const loading = ref(false);
const taskList = ref<TaskItem[]>([]);
const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
});

// 模态框状态
const modal = reactive({
  open: false,
  title: '审批',
  action: '',
  taskId: '',
});

// 表单状态
const formState = reactive({
  comment: '',
});

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

// 加载任务列表
const loadTaskList = async () => {
  loading.value = true;
  try {
    // 这里应该是调用API获取数据
    // 模拟API请求延迟
    await new Promise((resolve) => setTimeout(resolve, 500));
    taskList.value = mockTasks;
    pagination.total = mockTasks.length;
  } catch (error) {
    console.error('加载任务列表失败', error);
    message.error('加载任务列表失败');
  } finally {
    loading.value = false;
  }
};

// 表格变更处理
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.current = pag.current || 1;
  pagination.pageSize = pag.pageSize || 10;
  loadTaskList();
};

// 审批处理
const handleApprove = (record: TaskItem) => {
  modal.open = true;
  modal.title = '同意审批';
  modal.action = 'approve';
  modal.taskId = record.id;
};

// 拒绝处理
const handleReject = (record: TaskItem) => {
  modal.open = true;
  modal.title = '拒绝审批';
  modal.action = 'reject';
  modal.taskId = record.id;
};

// 查看流程详情
const viewProcessDetails = (record: TaskItem) => {
  message.info(`查看任务ID: ${record.id} 的详情`);
  // 这里可以跳转到详情页面
};

// 模态框确认
const handleModalOk = async () => {
  if (!formState.comment.trim()) {
    message.warning('请输入审批意见');
    return;
  }

  loading.value = true;
  try {
    // 这里应该是调用API提交审批
    // 模拟API请求
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 更新本地数据
    const task = taskList.value.find((t) => t.id === modal.taskId);
    if (task) {
      task.status = modal.action === 'approve' ? 'approved' : 'rejected';
    }

    message.success(modal.action === 'approve' ? '审批已同意' : '审批已拒绝');
    modal.open = false;
    formState.comment = '';
  } catch (error) {
    console.error('提交审批失败', error);
    message.error('提交审批失败');
  } finally {
    loading.value = false;
  }
};

// 模态框取消
const handleModalCancel = () => {
  modal.open = false;
  formState.comment = '';
};

// 组件挂载时初始化
onMounted(() => {
  loadTaskList();
  applyThemeStyles();
});
</script>

<template>
  <div class="approval-task-container" ref="containerRef">
    <ACard title="我的审批任务">
      <ATable
        :columns="columns"
        :data-source="taskList"
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
                @click="handleApprove(record)"
              >
                同意
              </AButton>
              <AButton danger size="small" @click="handleReject(record)">
                拒绝
              </AButton>
              <AButton
                type="link"
                size="small"
                @click="viewProcessDetails(record)"
              >
                查看详情
              </AButton>
            </ASpace>
          </template>
        </template>
      </ATable>
    </ACard>

    <AModal
      v-model:open="modal.open"
      :title="modal.title"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
    >
      <AForm :model="formState" layout="vertical">
        <AFormItem label="审批意见" name="comment">
          <ATextarea
            v-model:value="formState.comment"
            :rows="4"
            placeholder="请输入审批意见"
          />
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<style lang="less" scoped>
.approval-task-container {
  height: 100%;
}
</style>
