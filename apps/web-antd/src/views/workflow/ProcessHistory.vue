<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue';

import { onMounted, reactive, ref, watch } from 'vue';

// 导入主题相关
import { usePreferences } from '@vben/preferences';

import {
  Button as AButton,
  Card as ACard,
  Descriptions as ADescriptions,
  DescriptionsItem as ADescriptionsItem,
  Divider as ADivider,
  Modal as AModal,
  Table as ATable,
  Tag as ATag,
  Timeline as ATimeline,
  TimelineItem as ATimelineItem,
  Input,
  message,
} from 'ant-design-vue';

// 导入工作流主题样式
import './styles/workflow-theme.less';

// 创建一个组合组件的别名
const AInputSearch = Input.Search;

interface ProcessTask {
  id: string;
  name: string;
  assignee: string;
  status: string;
  createTime: string;
  endTime?: string;
  comment?: string;
}

interface ProcessHistory {
  id: string;
  definitionId: string;
  name: string;
  businessTitle: string;
  description: string;
  initiator: string;
  startTime: string;
  endTime?: string;
  status: string;
  variables: Record<string, any>;
  tasks: ProcessTask[];
}

// 表格列定义
const columns = [
  {
    title: '流程名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '业务标题',
    dataIndex: 'businessTitle',
    key: 'businessTitle',
  },
  {
    title: '发起人',
    dataIndex: 'initiator',
    key: 'initiator',
  },
  {
    title: '发起时间',
    dataIndex: 'startTime',
    key: 'startTime',
    sorter: true,
  },
  {
    title: '结束时间',
    dataIndex: 'endTime',
    key: 'endTime',
    sorter: true,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
  },
  {
    title: '操作',
    key: 'action',
  },
];

// 模拟流程历史数据
const mockProcessHistory: ProcessHistory[] = [
  {
    id: 'INST-001',
    definitionId: 'PROC-LEAVE-V1',
    name: '员工请假流程',
    businessTitle: '张三请假申请',
    description: '因病请假3天',
    initiator: '张三',
    startTime: '2023-10-10 09:30:00',
    endTime: '2023-10-11 14:20:00',
    status: 'completed',
    variables: {
      leaveType: '病假',
      startDate: '2023-10-12',
      endDate: '2023-10-14',
      leaveDays: '3',
      reason: '感冒发烧，需要休息',
    },
    tasks: [
      {
        id: 'TASK-001',
        name: '填写请假单',
        assignee: '张三',
        status: 'completed',
        createTime: '2023-10-10 09:30:00',
        endTime: '2023-10-10 09:35:00',
      },
      {
        id: 'TASK-002',
        name: '部门经理审批',
        assignee: '李经理',
        status: 'completed',
        createTime: '2023-10-10 09:35:00',
        endTime: '2023-10-10 14:20:00',
        comment: '同意，注意休息',
      },
      {
        id: 'TASK-003',
        name: '人事备案',
        assignee: '王人事',
        status: 'completed',
        createTime: '2023-10-10 14:20:00',
        endTime: '2023-10-11 14:20:00',
        comment: '已备案',
      },
    ],
  },
  {
    id: 'INST-002',
    definitionId: 'PROC-EXPENSE-V1',
    name: '费用报销流程',
    businessTitle: '李四差旅报销',
    description: '北京出差报销',
    initiator: '李四',
    startTime: '2023-10-08 10:15:00',
    status: 'active',
    variables: {
      expenseType: '差旅费',
      amount: '3500',
      tripDestination: '北京',
      tripPurpose: '客户拜访',
    },
    tasks: [
      {
        id: 'TASK-004',
        name: '填写报销单',
        assignee: '李四',
        status: 'completed',
        createTime: '2023-10-08 10:15:00',
        endTime: '2023-10-08 10:25:00',
      },
      {
        id: 'TASK-005',
        name: '部门经理审批',
        assignee: '张经理',
        status: 'completed',
        createTime: '2023-10-08 10:25:00',
        endTime: '2023-10-08 14:30:00',
        comment: '费用合理，同意报销',
      },
      {
        id: 'TASK-006',
        name: '财务审批',
        assignee: '赵财务',
        status: 'active',
        createTime: '2023-10-08 14:30:00',
      },
    ],
  },
  {
    id: 'INST-003',
    definitionId: 'PROC-PURCHASE-V1',
    name: '物资采购流程',
    businessTitle: '王五办公用品采购',
    description: '采购办公椅10张',
    initiator: '王五',
    startTime: '2023-10-05 11:20:00',
    endTime: '2023-10-07 16:40:00',
    status: 'rejected',
    variables: {
      purchaseType: '办公用品',
      item: '办公椅',
      quantity: '10',
      estimatedCost: '5000',
    },
    tasks: [
      {
        id: 'TASK-007',
        name: '填写采购申请',
        assignee: '王五',
        status: 'completed',
        createTime: '2023-10-05 11:20:00',
        endTime: '2023-10-05 11:30:00',
      },
      {
        id: 'TASK-008',
        name: '部门经理审批',
        assignee: '刘经理',
        status: 'completed',
        createTime: '2023-10-05 11:30:00',
        endTime: '2023-10-06 09:15:00',
        comment: '同意申请',
      },
      {
        id: 'TASK-009',
        name: '总经理审批',
        assignee: '陈总',
        status: 'rejected',
        createTime: '2023-10-06 09:15:00',
        endTime: '2023-10-07 16:40:00',
        comment: '当前预算紧张，暂缓采购',
      },
    ],
  },
];

// 状态
const loading = ref(false);
const processHistoryList = ref<ProcessHistory[]>([]);
const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
});

// 搜索关键词
const searchKeyword = ref('');

// 流程详情
const detailVisible = ref(false);
const currentProcess = ref<null | ProcessHistory>(null);

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

// 获取状态颜色
const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    active: 'processing',
    completed: 'success',
    rejected: 'error',
    canceled: 'default',
    suspended: 'warning',
  };
  return colorMap[status] || 'default';
};

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    active: '进行中',
    completed: '已完成',
    rejected: '已拒绝',
    canceled: '已取消',
    suspended: '已挂起',
  };
  return textMap[status] || status;
};

// 获取任务节点颜色
const getTaskColor = (status: string) => {
  const colorMap: Record<string, string> = {
    active: 'blue',
    completed: 'green',
    rejected: 'red',
    canceled: 'grey',
  };
  return colorMap[status] || 'blue';
};

// 加载流程历史数据
const loadProcessHistory = async () => {
  loading.value = true;
  try {
    // 模拟API请求延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 如果有搜索关键词，按关键词过滤数据
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.toLowerCase();
      processHistoryList.value = mockProcessHistory.filter(
        (item) =>
          item.name.toLowerCase().includes(keyword) ||
          item.businessTitle.toLowerCase().includes(keyword) ||
          item.initiator.toLowerCase().includes(keyword),
      );
    } else {
      processHistoryList.value = mockProcessHistory;
    }

    pagination.total = processHistoryList.value.length;
  } catch (error) {
    console.error('加载流程历史失败', error);
    message.error('加载流程历史失败');
  } finally {
    loading.value = false;
  }
};

// 表格变更处理
const handleTableChange = (pag: TablePaginationConfig) => {
  pagination.current = pag.current || 1;
  pagination.pageSize = pag.pageSize || 10;
  loadProcessHistory();
};

// 搜索处理
const handleSearch = () => {
  pagination.current = 1;
  loadProcessHistory();
};

// 查看流程详情
const viewProcessDetails = (record: ProcessHistory) => {
  currentProcess.value = record;
  detailVisible.value = true;
};

// 组件挂载时初始化
onMounted(() => {
  loadProcessHistory();
  applyThemeStyles();
});
</script>

<template>
  <div class="process-history-container" ref="containerRef">
    <ACard title="流程历史记录">
      <template #extra>
        <AInputSearch
          v-model:value="searchKeyword"
          placeholder="输入关键词搜索"
          style="width: 250px"
          @search="handleSearch"
        />
      </template>

      <ATable
        :columns="columns"
        :data-source="processHistoryList"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <ATag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </ATag>
          </template>
          <template v-else-if="column.key === 'action'">
            <AButton type="link" @click="viewProcessDetails(record)">
              查看详情
            </AButton>
          </template>
        </template>
      </ATable>
    </ACard>

    <AModal
      v-model:open="detailVisible"
      title="流程详情"
      width="800px"
      :footer="null"
    >
      <template v-if="currentProcess">
        <ADescriptions bordered :column="2">
          <ADescriptionsItem label="流程名称" :span="2">
            {{ currentProcess.name }}
          </ADescriptionsItem>
          <ADescriptionsItem label="流程实例ID">
            {{ currentProcess.id }}
          </ADescriptionsItem>
          <ADescriptionsItem label="流程定义ID">
            {{ currentProcess.definitionId }}
          </ADescriptionsItem>
          <ADescriptionsItem label="发起人">
            {{ currentProcess.initiator }}
          </ADescriptionsItem>
          <ADescriptionsItem label="发起时间">
            {{ currentProcess.startTime }}
          </ADescriptionsItem>
          <ADescriptionsItem label="结束时间">
            {{ currentProcess.endTime || '-' }}
          </ADescriptionsItem>
          <ADescriptionsItem label="状态">
            <ATag :color="getStatusColor(currentProcess.status)">
              {{ getStatusText(currentProcess.status) }}
            </ATag>
          </ADescriptionsItem>
          <ADescriptionsItem label="业务标题" :span="2">
            {{ currentProcess.businessTitle }}
          </ADescriptionsItem>
          <ADescriptionsItem label="说明" :span="2">
            {{ currentProcess.description }}
          </ADescriptionsItem>
        </ADescriptions>

        <ADivider orientation="left">流程变量</ADivider>
        <ADescriptions bordered :column="2">
          <template v-for="(value, key) in currentProcess.variables" :key="key">
            <ADescriptionsItem :label="key">{{ value }}</ADescriptionsItem>
          </template>
        </ADescriptions>

        <ADivider orientation="left">流程审批记录</ADivider>
        <ATimeline>
          <ATimelineItem
            v-for="(task, index) in currentProcess.tasks"
            :key="index"
            :color="getTaskColor(task.status)"
          >
            <div class="task-item">
              <div class="task-header">
                <span class="task-name">{{ task.name }}</span>
                <span class="task-time">{{
                  task.endTime || task.createTime
                }}</span>
              </div>
              <div class="task-assignee">处理人: {{ task.assignee }}</div>
              <div class="task-status">
                状态:
                <ATag :color="getStatusColor(task.status)">
                  {{ getStatusText(task.status) }}
                </ATag>
              </div>
              <div v-if="task.comment" class="task-comment">
                审批意见: {{ task.comment }}
              </div>
            </div>
          </ATimelineItem>
        </ATimeline>

        <ADivider orientation="left">流程图</ADivider>
        <div class="process-diagram">
          <div class="diagram-placeholder">
            <h3>流程图展示区域</h3>
            <p>实际使用时这里应接入BPMN流程图渲染</p>
          </div>
        </div>
      </template>
    </AModal>
  </div>
</template>

<style lang="less" scoped>
.process-history-container {
  height: 100%;
  padding: 16px;

  .task-item {
    padding: 8px 0;

    .task-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;

      .task-name {
        font-weight: bold;
      }

      .task-time {
        color: rgba(0, 0, 0, 0.45);

        .workflow-dark-theme & {
          color: rgba(255, 255, 255, 0.65);
        }
      }
    }

    .task-assignee,
    .task-status {
      margin-bottom: 4px;
    }

    .task-comment {
      background-color: #f9f9f9;
      padding: 8px;
      border-radius: 4px;
      margin-top: 8px;

      .workflow-dark-theme & {
        background-color: hsl(var(--accent-dark));
      }
    }
  }

  .process-diagram {
    margin-top: 16px;
    height: 300px;
    border: 1px dashed #d9d9d9;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;

    .diagram-placeholder {
      text-align: center;
      color: rgba(0, 0, 0, 0.45);

      .workflow-dark-theme & {
        color: rgba(255, 255, 255, 0.65);
      }
    }
  }
}
</style>
