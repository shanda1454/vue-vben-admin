<script lang="ts" setup>
import { ref, watch } from 'vue';
import { Button, Space, Table, Tag, Tooltip, Empty } from 'ant-design-vue';
import { EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons-vue';
import type { FormManagementApi } from '#/api/formManagement';
import { h } from 'vue';

// 组件属性
const props = defineProps<{
  fields: FormManagementApi.FormField[];
  loading?: boolean;
}>();

// 事件
const emit = defineEmits(['edit', 'delete']);

// 设置列定义
const columns = [
  {
    title: '数据库字段名',
    dataIndex: 'dbFieldName',
    key: 'dbFieldName',
    width: 160,
    customRender: ({ text, record }: { text: string; record: FormManagementApi.FormField }) => {
      if (record.isViewField) {
        return h('div', [
          text,
          h(Tooltip, { title: '视图字段，不映射到数据库' }, {
            default: () => h(Tag, { color: 'blue', style: { marginLeft: '4px' } }, { default: () => '视图' })
          })
        ]);
      }
      return text;
    },
  },
  {
    title: '字段名称',
    dataIndex: 'fieldLabel',
    key: 'fieldLabel',
    width: 140,
  },
  {
    title: '字段类型',
    dataIndex: 'fieldType',
    key: 'fieldType',
    width: 120,
  },
  {
    title: '属性',
    key: 'properties',
    width: 180,
    customRender: ({ record }: { record: FormManagementApi.FormField }) => {
      const tags = [];
      
      if (record.isRequired) {
        tags.push(h(Tag, { color: 'red', key: 'required' }, { default: () => '必填' }));
      }
      
      if (record.nonNegative) {
        tags.push(h(Tag, { color: 'purple', key: 'non-negative' }, { default: () => '非负数' }));
      }
      
      if (record.nonZero) {
        tags.push(h(Tag, { color: 'orange', key: 'non-zero' }, { default: () => '非零' }));
      }
      
      if (record.isCheckboxStyle) {
        tags.push(h(Tag, { color: 'cyan', key: 'checkbox' }, { default: () => '勾选样式' }));
      }
      
      if (record.isPercentageStyle) {
        tags.push(h(Tag, { color: 'green', key: 'percentage' }, { default: () => '百分比' }));
      }
      
      return h(Space, { wrap: true }, { default: () => tags });
    },
  },
  {
    title: '默认值',
    dataIndex: 'defaultValue',
    key: 'defaultValue',
    width: 120,
    customRender: ({ text }: { text: string }) => {
      if (text === undefined || text === null || text === '') {
        return h('span', { style: { color: '#bfbfbf' } }, '--');
      }
      return text;
    },
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    width: 200,
    ellipsis: true,
    customRender: ({ text }: { text: string }) => {
      if (!text) {
        return h('span', { style: { color: '#bfbfbf' } }, '--');
      }
      
      if (text.length > 20) {
        return h(Tooltip, { title: text }, {
          default: () => h('span', {}, `${text.slice(0, 20)}...`)
        });
      }
      
      return text;
    },
  },
  {
    title: '操作',
    key: 'action',
    width: 210,
    fixed: 'right',
    customRender: ({ record }: { record: FormManagementApi.FormField }) => {
      return h(Space, {}, {
        default: () => [
          h(Button, {
            type: 'link',
            size: 'small',
            onClick: () => emit('edit', record)
          }, {
            default: () => [h(EditOutlined), '编辑']
          }),
          h(Button, {
            type: 'link',
            size: 'small',
            danger: true,
            onClick: () => emit('delete', record.id)
          }, {
            default: () => [h(DeleteOutlined), '删除']
          })
        ]
      });
    },
  },
];

// 判断是否有数据
const hasData = ref(false);

// 监听数据变化
watch(() => props.fields, (val) => {
  hasData.value = val && val.length > 0;
}, { immediate: true });
</script>

<template>
  <div class="field-table-container">
    <div v-if="!hasData" class="empty-container">
      <InfoCircleOutlined style=" margin-bottom: 8px;font-size: 24px; color: #bfbfbf;" />
      <p>暂无字段数据，请添加字段</p>
    </div>
    <template v-else>
      <div class="custom-table">
        <div class="table-header">
          <div class="header-cell" style="width: 160px">数据库字段名</div>
          <div class="header-cell" style="width: 140px">字段名称</div>
          <div class="header-cell" style="width: 120px">字段类型</div>
          <div class="header-cell" style="width: 180px">属性</div>
          <div class="header-cell" style="width: 120px">默认值</div>
          <div class="header-cell" style="flex: 1">描述</div>
          <div class="header-cell" style="width: 210px">操作</div>
        </div>
        <div class="table-body">
          <div v-for="field in fields" :key="field.id" class="table-row">
            <div class="table-cell" style="width: 160px">
              <span>{{ field.dbFieldName }}</span>
              <Tag v-if="field.isViewField" color="blue" style="margin-left: 4px">视图</Tag>
            </div>
            <div class="table-cell" style="width: 140px">{{ field.fieldLabel }}</div>
            <div class="table-cell" style="width: 120px">{{ field.fieldType }}</div>
            <div class="table-cell" style="width: 180px">
              <Space wrap>
                <Tag v-if="field.isRequired" color="red">必填</Tag>
                <Tag v-if="field.nonNegative" color="purple">非负数</Tag>
                <Tag v-if="field.nonZero" color="orange">非零</Tag>
                <Tag v-if="field.isCheckboxStyle" color="cyan">勾选样式</Tag>
                <Tag v-if="field.isPercentageStyle" color="green">百分比</Tag>
              </Space>
            </div>
            <div class="table-cell" style="width: 120px">
              <span v-if="field.defaultValue">{{ field.defaultValue }}</span>
              <span v-else style="color: #bfbfbf">--</span>
            </div>
            <div class="table-cell ellipsis" style="flex: 1">
              <Tooltip v-if="field.description && field.description.length > 20" :title="field.description">
                {{ field.description.slice(0, 20) }}...
              </Tooltip>
              <span v-else-if="field.description">{{ field.description }}</span>
              <span v-else style="color: #bfbfbf">--</span>
            </div>
            <div class="table-cell" style="width: 210px">
              <Space>
                <Button type="link" size="small" @click="emit('edit', field)">
                  <EditOutlined /> 编辑
                </Button>
                <Button type="link" size="small" danger @click="emit('delete', field.id)">
                  <DeleteOutlined /> 删除
                </Button>
              </Space>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.field-table-container {
  width: 100%;
  margin-bottom: 24px;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 32px;
  color: #8c8c8c;
  text-align: center;
  background-color: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 2px;
}

.custom-table {
  width: 100%;
  overflow: hidden;
  border: 1px solid #f0f0f0;
  border-radius: 2px;
}

.table-header {
  display: flex;
  background-color: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.header-cell {
  padding: 12px 8px;
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-body {
  background-color: #fff;
}

.table-row {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
}

.table-row:nth-child(even) {
  background-color: #fafafa;
}

.table-row:hover {
  background-color: #f5f5f5;
}

.table-cell {
  padding: 12px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style> 
