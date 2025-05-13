// apps/web-antd/src/views/system/menu/data.ts
import type { VxeGridProps } from '#/adapter/vxe-table';
// @ts-ignore
import { $t } from '#/locales';
import { IconifyIcon } from '@vben/icons';
import { Button, Space, Tag } from 'ant-design-vue';
import { h } from 'vue';
import { formatDate } from '@vben/utils';

// 定义表格列
export const columns: VxeGridProps['columns'] = [
  { title:  $t('system.index'), type: 'seq', width: 50 },
  {
    title: $t('system.menuColumn.title'), // 添加标题列
    field: 'title',
    width: 180,
    treeNode: true,
    slots: {
      default: ({ row }: { row: { icon?: string;title: string } }) => {
        // 使用 $t 函数处理标题的国际化
        return h('div', { class: 'flex items-center' }, [
          row.icon && h(IconifyIcon, { icon: row.icon, class: 'mr-2' }),
          h('span', {}, $t(row.title))
        ]);
      },
    },
  },
  {
    title: $t('system.menuColumn.menuName'),
    field: 'name', 
    width: 200,
  },
  {
    title: $t('system.menuColumn.icon'),
    field: 'icon',
    width: 100,
    slots: {
      default: ({ row }: { row: { icon?: string } }) => {
        return row.icon ? [h(IconifyIcon, { icon: row.icon })] : [];
      },
    },
  },
  {
    title: $t('system.menuColumn.path'),
    field: 'path',
    width: 180,
  },
  {
    title: $t('system.menuColumn.component'),
    field: 'component',
    width: 180,
  },
  {
    title: $t('system.menuColumn.orderNum'),
    field: 'orderNum',
    width: 80,
  },
  {
    title: $t('system.menuColumn.status'),
    field: 'status',
    width: 100,
    slots: {
      default: ({ row }: { row: { status: string } }) => {
        return [
          h(Tag, {
            color: row.status === '1' ? 'success' : 'error',
          }, () => row.status === '1' ? $t('system.enable') : $t('system.disable')),
        ];
      },
    },
  },
  {
    title: $t('system.menuColumn.createTime'),
    field: 'createTime',
    width: 180,
    formatter: ({ cellValue }) => {
      return cellValue ? formatDate(cellValue, 'YYYY-MM-DD HH:mm:ss') : '';
    },
  },
  {
    title: $t('system.menuColumn.action'),
    width: 250,
    fixed: 'right',
    slots: {
      default: 'action'
    },
  },
];

// 定义搜索表单
// 定义搜索表单
export const searchFormSchema = [
  {
    field: 'name',
    label: '菜单名称',
    component: 'Input',
    colProps: { span: 8 },
  },
  {
    field: 'status',
    label: '状态',
    component: 'Select',
    componentProps: {
      options: [
        { label: '启用', value: '1' },
        { label: '停用', value: '0' },
      ],
    },
    colProps: { span: 8 },
  },
];

// 定义操作函数

