import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';
import type { FormManagementApi } from '#/api/formManagement';

// 定义操作点击函数接口和类型
export interface OnActionClickParams<T> {
  code: string;
  row: T;
}

export type OnActionClickFn<T> = (params: OnActionClickParams<T>) => void;

/**
 * 数据库类型选项
 */
export function getDbTypeOptions() {
  return [
    { label: 'SQL Server', value: 'sqlserver' },
    // 后续可以添加其他数据库类型
  ];
}

/**
 * 控件类型对应的数据库字段类型映射
 */
export const controlTypeToDbTypeMap: Record<string, string> = {
  // 文本类型
  input: 'NVarChar',
  textarea: 'NText',
  
  // 数字类型
  number: 'Decimal',
  
  // 日期类型
  date: 'Date',
  datetime: 'DateTime',
  
  // 布尔类型
  checkbox: 'Bit',
  switch: 'Bit',
  
  // 选择类型
  select: 'NVarChar',
  radio: 'NVarChar',
};

/**
 * 获取数据库字段类型选项
 */
export function getDbFieldTypeOptions() {
  return [
    { label: 'Int', value: 'Int' },
    { label: 'BigInt', value: 'BigInt' },
    { label: 'Decimal', value: 'Decimal' },
    { label: 'Float', value: 'Float' },
    { label: 'Double', value: 'Double' },
    { label: 'Bit', value: 'Bit' },
    { label: 'Boolean', value: 'Boolean' },
    { label: 'DateTime', value: 'DateTime' },
    { label: 'Date', value: 'Date' },
    { label: 'Time', value: 'Time' },
    { label: 'Char', value: 'Char' },
    { label: 'NChar', value: 'NChar' },
    { label: 'VarChar', value: 'VarChar' },
    { label: 'NVarChar', value: 'NVarChar' },
    { label: 'Text', value: 'Text' },
    { label: 'NText', value: 'NText' },
    { label: 'Guid', value: 'Guid' },
    { label: 'Binary', value: 'Binary' },
    { label: 'Image', value: 'Image' },
  ];
}

/**
 * 获取模块选项
 */
export function getModuleOptions() {
  return [
    { label: '系统', value: '系统' },
    { label: '业务', value: '业务' },
    { label: '财务', value: '财务' },
    { label: '人力资源', value: '人力资源' },
    { label: '生产', value: '生产' },
    { label: '仓库', value: '仓库' },
    { label: '采购', value: '采购' },
    { label: '销售', value: '销售' },
    { label: '质量', value: '质量' },
    { label: '设备', value: '设备' },
  ];
}

/**
 * 表单管理列表页表格列定义
 */
export function useColumns(
  onActionClick: OnActionClickFn<FormManagementApi.FormBase>,
): VxeTableGridOptions<FormManagementApi.FormBase>['columns'] {
  return [
    {
      field: 'formName',
      title: '表单名称',
      width: 200,
    },
    {
      field: 'module',
      title: '所属模块',
      width: 120,
    },
    {
      field: 'tableName',
      title: '数据表名',
      width: 200,
    },
    {
      field: 'description',
      title: '描述',
      minWidth: 200,
    },
    {
      field: 'createTime',
      title: '创建时间',
      width: 180,
    },
    {
      field: 'updateTime',
      title: '更新时间',
      width: 180,
    },
    {
      title: '操作',
      width: 280,
      field: 'operation',
      fixed: 'right',
      headerAlign: 'center',
      align: 'center',
      showOverflow: false,
      slots: {
        default: 'action' // 使用名为action的插槽
      }
    },
  ];
}

/**
 * 表单字段表格列定义
 */
export function useFieldColumns(
  onActionClick: OnActionClickFn<FormManagementApi.FormField>,
): VxeTableGridOptions<FormManagementApi.FormField>['columns'] {
  return [
    {
      field: 'dbFieldName',
      title: '数据库字段名',
      width: 150,
    },
    {
      field: 'entityFieldName',
      title: '实体字段名',
      width: 150,
    },
    {
      field: 'fieldLabel',
      title: '字段名称',
      width: 150,
    },
    {
      field: 'fieldType',
      title: '字段类型',
      width: 120,
    },
    {
      align: 'center',
      cellRender: { name: 'CellBool' },
      field: 'isViewField',
      title: '视图字段',
      width: 80,
    },
    {
      align: 'center',
      cellRender: { name: 'CellBool' },
      field: 'isRequired',
      title: '必填',
      width: 80,
    },
    {
      align: 'center',
      cellRender: { name: 'CellBool' },
      field: 'nonNegative',
      title: '非负数',
      width: 80,
    },
    {
      align: 'center',
      cellRender: { name: 'CellBool' },
      field: 'nonZero',
      title: '非零',
      width: 80,
    },
    {
      align: 'center',
      cellRender: { name: 'CellBool' },
      field: 'isCheckboxStyle',
      title: '勾选样式',
      width: 80,
    },
    {
      align: 'center',
      cellRender: { name: 'CellBool' },
      field: 'isPercentageStyle',
      title: '百分比样式',
      width: 80,
    },
    {
      field: 'defaultValue',
      title: '默认值',
      width: 120,
    },
    {
      cellRender: {
        attrs: {
          nameField: 'fieldLabel',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          'edit', // 默认的编辑按钮
          'delete', // 默认的删除按钮
        ],
      },
      fixed: 'right',
      headerAlign: 'center',
      showOverflow: false,
      title: '操作',
      width: 250,
    },
  ];
}

/**
 * 表单子表表格列定义
 */
export function useSubTableColumns(
  onActionClick: OnActionClickFn<FormManagementApi.FormSubTable>,
): VxeTableGridOptions<FormManagementApi.FormSubTable>['columns'] {
  return [
    {
      field: 'tableTitle',
      title: '表标题',
      width: 150,
    },
    {
      field: 'tableName',
      title: '表名',
      width: 200,
    },
    {
      field: 'tableSuffix',
      title: '表后缀',
      width: 100,
    },
    {
      align: 'center',
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'blue', label: '子表', value: 'sub' },
          { color: 'purple', label: '孙表', value: 'grandson' },
        ],
      },
      field: 'tableType',
      title: '表类型',
      width: 80,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'tableTitle',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          'edit', // 默认的编辑按钮
          {
            code: 'config',
            text: '配置字段',
          },
          'delete', // 默认的删除按钮
        ],
      },
      field: 'operation',
      fixed: 'right',
      headerAlign: 'center',
      showOverflow: false,
      title: '操作',
      width: 200,
    },
  ];
} 
