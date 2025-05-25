import { requestClient } from '../request';

export namespace FormManagementApi {
  /**
   * 表单基本信息
   */
  export interface FormBase {
    id: number;
    /** 表单名称 */
    formName: string;
    /** 所属模块 */
    module: string;
    /** 数据表名 */
    tableName: string;
    /** 创建时间 */
    createTime: string;
    /** 更新时间 */
    updateTime: string;
    /** 描述 */
    description?: string;
  }

  /**
   * 表单字段信息
   */
  export interface FormField {
    id: number;
    /** 所属表单ID */
    formId: number;
    /** 所属表类型：main-主表, sub-子表, grandson-孙表 */
    tableType: 'main' | 'sub' | 'grandson';
    /** 所属表ID（子表、孙表时使用） */
    tableId?: number;
    /** 数据库字段名 */
    dbFieldName: string;
    /** 实体字段名 */
    entityFieldName: string;
    /** 字段名称（中文） */
    fieldLabel: string;
    /** 字段类型（数据库类型） */
    fieldType: string;
    /** 是否视图字段（不映射数据库） */
    isViewField: boolean;
    /** 是否不能为空 */
    isRequired: boolean;
    /** 是否不能为负数 */
    nonNegative?: boolean;
    /** 是否不能为0 */
    nonZero?: boolean;
    /** 是否勾选样式 */
    isCheckboxStyle?: boolean;
    /** 是否百分比样式 */
    isPercentageStyle?: boolean;
    /** 默认值 */
    defaultValue?: string;
    /** 描述 */
    description?: string;
    /** 占位文本 */
    placeholder?: string;
    /** 最小值 */
    minValue?: number | null;
    /** 最大值 */
    maxValue?: number | null;
    /** 精度(小数位) */
    precision?: number;
    /** 控件类型 */
    controlType?: string;
    /** 选项列表 */
    options?: any[];
    /** 父表ID（子表、孙表字段时使用） */
    parentTableId?: number;
    /** 排序号 */
    orderNo: number;
  }

  /**
   * 子表信息
   */
  export interface FormSubTable {
    id: number;
    /** 所属表单ID */
    formId: number;
    /** 子表名称 */
    tableName: string;
    /** 子表描述 */
    description?: string;
    /** 排序号 */
    orderNo: number;
  }

  /**
   * 表单详情（包含字段和子表信息）
   */
  export interface FormDetail extends FormBase {
    /** 主表字段列表 */
    mainFields?: FormField[];
    /** 子表列表 */
    subTables?: FormSubTable[];
    /** 子表字段映射，key为子表ID，value为该子表的字段列表 */
    subFields?: Record<number, FormField[]>;
  }
}

/**
 * 获取表单列表
 */
export function getFormList() {
  return requestClient.get<FormManagementApi.FormBase[]>('/Form/List');
}

/**
 * 获取表单详情
 * @param id 表单ID
 */
export function getFormDetail(id: number) {
  return requestClient.get<FormManagementApi.FormDetail>(`/Form/Detail/${id}`);
}

/**
 * 创建表单
 * @param form 表单信息
 */
export function createForm(form: Partial<FormManagementApi.FormDetail>) {
  return requestClient.post<FormManagementApi.FormBase>('/Form/Create', form);
}

/**
 * 更新表单
 * @param form 表单信息
 */
export function updateForm(form: Partial<FormManagementApi.FormDetail>) {
  return requestClient.put<FormManagementApi.FormBase>('/Form/Update', form);
}

/**
 * 删除表单
 * @param id 表单ID
 */
export function deleteForm(id: number) {
  return requestClient.delete(`/Form/Delete/${id}`);
}

/**
 * 检查表单名称是否存在
 * @param formName 表单名称
 * @param excludeId 排除的表单ID（用于编辑时检查）
 */
export function checkFormName(formName: string, excludeId?: number) {
  return requestClient.get<boolean>('/Form/CheckName', {
    params: { formName, excludeId },
  });
}

/**
 * 检查表名是否存在
 * @param tableName 表名
 * @param excludeId 排除的表单ID（用于编辑时检查）
 */
export function checkTableName(tableName: string, excludeId?: number) {
  return requestClient.get<boolean>('/Form/CheckTableName', {
    params: { tableName, excludeId },
  });
}

/**
 * 字段管理API
 */

// 字段类型定义
export interface FieldDto {
  id?: number;
  formId: number;
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  orderNo?: number;
  description?: string;
}

/**
 * 获取表单字段列表
 * @param formId 表单ID
 */
export async function getFields(formId: number): Promise<FormManagementApi.FormField[]> {
  try {
    // 使用真实API
    return requestClient.get<FormManagementApi.FormField[]>(`/Form/Fields/${formId}`);
  } catch (error) {
    console.error('获取字段列表失败:', error);
    return [];
  }
}

/**
 * 创建表单字段
 * @param formId 表单ID
 * @param field 字段信息
 */
export async function createField(formId: number, field: Partial<FormManagementApi.FormField>): Promise<FormManagementApi.FormField> {
  try {
    // 使用真实API
    return requestClient.post<FormManagementApi.FormField>(`/Form/CreateField`, { ...field, formId });
  } catch (error) {
    console.error('创建字段失败:', error);
    throw error;
  }
}

/**
 * 更新表单字段
 * @param fieldId 字段ID
 * @param field 字段信息
 */
export async function updateField(fieldId: number, field: Partial<FormManagementApi.FormField>): Promise<FormManagementApi.FormField> {
  try {
    // 使用真实API
    return requestClient.put<FormManagementApi.FormField>(`/Form/UpdateField/${fieldId}`, field);
  } catch (error) {
    console.error('更新字段失败:', error);
    throw error;
  }
}

/**
 * 删除表单字段
 * @param fieldId 字段ID
 */
export async function deleteField(fieldId: number): Promise<boolean> {
  try {
    // 使用真实API
    return requestClient.delete<boolean>(`/Form/DeleteField/${fieldId}`);
  } catch (error) {
    console.error('删除字段失败:', error);
    throw error;
  }
}

/**
 * 获取子表字段列表
 * @param subTableId 子表ID
 */
export async function getSubTableFields(subTableId: number): Promise<FormManagementApi.FormField[]> {
  try {
    // 使用真实API
    return requestClient.get<FormManagementApi.FormField[]>(`/Form/SubTableFields/${subTableId}`);
  } catch (error) {
    console.error('获取子表字段列表失败:', error);
    return [];
  }
}

/**
 * 创建子表
 * @param formId 表单ID
 * @param subTable 子表信息
 */
export async function createSubTable(
  formId: number, 
  subTable: Partial<FormManagementApi.FormSubTable>
): Promise<FormManagementApi.FormSubTable> {
  try {
    // 使用真实API
    return requestClient.post<FormManagementApi.FormSubTable>(`/Form/CreateSubTable`, { ...subTable, formId });
  } catch (error) {
    console.error('创建子表失败:', error);
    throw error;
  }
}

/**
 * 更新子表
 * @param subTableId 子表ID
 * @param subTable 子表信息
 */
export async function updateSubTable(
  subTableId: number, 
  subTable: Partial<FormManagementApi.FormSubTable>
): Promise<FormManagementApi.FormSubTable> {
  try {
    // 使用真实API
    return requestClient.put<FormManagementApi.FormSubTable>(`/Form/UpdateSubTable/${subTableId}`, subTable);
  } catch (error) {
    console.error('更新子表失败:', error);
    throw error;
  }
}

/**
 * 删除子表
 * @param subTableId 子表ID
 */
export async function deleteSubTable(subTableId: number): Promise<boolean> {
  try {
    // 使用真实API
    return requestClient.delete<boolean>(`/Form/DeleteSubTable/${subTableId}`);
  } catch (error) {
    console.error('删除子表失败:', error);
    throw error;
  }
} 
