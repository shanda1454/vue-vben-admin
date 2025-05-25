<script lang="ts" setup>
import { ref, watch, reactive } from 'vue';
import { Modal, Form, Input, Select, Switch, Divider, Tabs, Row, Col, Alert, Tooltip } from 'ant-design-vue';
import { InfoCircleOutlined } from '@ant-design/icons-vue';
import type { FormManagementApi } from '#/api/formManagement';
import { getDbFieldTypeOptions, getDbTypeOptions, controlTypeToDbTypeMap } from '../data';

// 组件属性
const props = defineProps<{
  open: boolean;
  field: Partial<FormManagementApi.FormField> | null;
  formId?: number;  // 表单ID
  tableType?: 'main' | 'sub' | 'grandson'; // 表类型
  parentTableId?: number; // 父表ID，用于子表和孙表
}>();

// 组件事件
const emit = defineEmits(['update:open', 'save']);

// 表单实例引用
const formRef = ref();
const activeKey = ref('basic'); // 当前激活的标签页
const confirmLoading = ref(false);

// 表单状态
const formState = reactive<Partial<FormManagementApi.FormField>>({
  id: undefined,
  formId: props.formId,
  dbFieldName: '',         // 数据库字段名
  entityFieldName: '',     // 实体字段名
  fieldLabel: '',          // 字段显示名称
  fieldType: 'NVarChar',   // 字段类型(数据库)
  fieldLength: 50,         // 字段长度
  isViewField: false,      // 是否视图字段(不映射到数据库)
  isRequired: false,       // 是否必填
  nonNegative: false,      // 是否非负数
  nonZero: false,          // 是否非零
  isCheckboxStyle: false,  // 是否勾选样式
  isPercentageStyle: false,// 是否百分比样式
  defaultValue: '',        // 默认值
  description: '',         // 描述
  orderNo: 0,              // 排序号
  controlType: 'input',    // 控件类型
  minValue: null,          // 最小值
  maxValue: null,          // 最大值
  precision: 2,            // 精度(小数位数)
  options: [],             // 选项(下拉框/单选/多选等)
  placeholder: '',         // 占位文本
  tableType: props.tableType || 'main',      // 表类型
  parentTableId: props.parentTableId,        // 父表ID
});

// 是否为编辑模式
const isEdit = ref(false);
const title = ref('新增字段');

// 数据库类型
const dbType = ref('sqlserver');

// 监听控件类型变化，自动设置对应的数据库字段类型
watch(() => formState.controlType, (val) => {
  if (val && !formState.isViewField) {
    const dbFieldType = controlTypeToDbTypeMap[val];
    if (dbFieldType) {
      formState.fieldType = dbFieldType;
    }
  }
});

// 表单验证规则
const rules = {
  dbFieldName: [
    { required: true, message: '请输入数据库字段名', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '字段名必须以字母开头，只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  entityFieldName: [
    { required: true, message: '请输入实体字段名', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '字段名必须以字母开头，只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  fieldLabel: [
    { required: true, message: '请输入字段显示名称', trigger: 'blur' }
  ],
  fieldType: [
    { required: true, message: '请选择字段类型', trigger: 'change' }
  ]
};

// 根据数据库字段名自动生成实体字段名
watch(() => formState.dbFieldName, (val) => {
  if (val && !formState.entityFieldName) {
    // 转换为驼峰命名
    const parts = val.split('_');
    formState.entityFieldName = parts.map((part, index) => {
      if (index === 0) {
        return part.toLowerCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join('');
  }
});

// 根据数据库字段名自动生成字段显示名称
watch(() => formState.dbFieldName, (val) => {
  if (val && !formState.fieldLabel) {
    // 简单转换，实际项目可能需要更复杂的逻辑
    formState.fieldLabel = val.replace(/_/g, ' ');
  }
});

// 数字类型字段的附加校验控制
const isNumberType = ref(false);
watch(() => formState.fieldType, (val) => {
  // 判断是否为数字类型
  isNumberType.value = ['Int', 'BigInt', 'Decimal', 'Float', 'Double'].includes(val as string);
  
  // 如果是非数字类型，重置相关字段
  if (!isNumberType.value) {
    formState.nonNegative = false;
    formState.nonZero = false;
    formState.isPercentageStyle = false;
    formState.minValue = null;
    formState.maxValue = null;
    formState.precision = 2;
  }
});

// 判断是否为字符串类型
const isStringType = ref(false);

// 检查字段类型是否为字符串类型
function checkIsStringType(type: string) {
  return ['Char', 'NChar', 'VarChar', 'NVarChar'].includes(type);
}

// 初始化时检查字段类型
isStringType.value = checkIsStringType(formState.fieldType as string);

// 监听字段类型变化
watch(() => formState.fieldType, (val) => {
  // 判断是否为字符串类型
  isStringType.value = checkIsStringType(val as string);
  
  // 如果是非字符串类型，重置字段长度
  if (!isStringType.value) {
    formState.fieldLength = 50;
  }
});

// 监听字段数据变化
watch(() => props.field, (val) => {
  if (val && val.id) {  // 修改判断条件，只有当字段有id时才认为是编辑模式
    // 编辑模式
    isEdit.value = true;
    title.value = `编辑字段 - ${val.fieldLabel || ''}`;
    // 复制所有属性
    Object.keys(val).forEach(key => {
      if (key in formState) {
        // @ts-ignore
        formState[key] = val[key];
      }
    });
    
    // 确保必要的字段被设置
    formState.formId = props.formId;
    formState.tableType = props.tableType || 'main';
    formState.parentTableId = props.parentTableId;
    
    // 手动触发类型检查
    isNumberType.value = ['Int', 'BigInt', 'Decimal', 'Float', 'Double'].includes(formState.fieldType as string);
  } else {
    // 新增模式
    isEdit.value = false;
    title.value = '新增字段';
    // 重置表单
    resetForm();
  }
}, { immediate: true });

// 重置表单
function resetForm() {
  Object.assign(formState, {
    id: undefined,
    formId: props.formId,
    dbFieldName: '',
    entityFieldName: '',
    fieldLabel: '',
    fieldType: 'NVarChar',
    fieldLength: 50,
    isViewField: false,
    isRequired: false,
    nonNegative: false,
    nonZero: false,
    isCheckboxStyle: false,
    isPercentageStyle: false,
    defaultValue: '',
    description: '',
    orderNo: 0,
    controlType: 'input',
    minValue: null,
    maxValue: null,
    precision: 2,
    options: [],
    placeholder: '',
    tableType: props.tableType || 'main',
    parentTableId: props.parentTableId,
  });
  
  // 重置标签页
  activeKey.value = 'basic';
  
  // 重置数字类型检查
  isNumberType.value = false;
  
  // 重置字符串类型检查
  isStringType.value = checkIsStringType(formState.fieldType as string);
}

// 提交表单
async function handleOk() {
  try {
    confirmLoading.value = true;
    
    // 表单验证
    await formRef.value.validate();
    
    // 提交数据
    emit('save', { ...formState });
    
    // 关闭弹窗
    emit('update:open', false);
  } catch (error) {
    console.error('表单验证失败:', error);
  } finally {
    confirmLoading.value = false;
  }
}

// 取消操作
function handleCancel() {
  emit('update:open', false);
}
</script>

<template>
  <Modal
    :open="props.open"
    :title="title"
    :width="700"
    :maskClosable="false"
    :destroyOnClose="true"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <Alert
      v-if="!formState.isViewField && isEdit && formState.id"
      message="注意"
      description="修改数据库字段名、字段类型等属性可能会影响数据库结构，请谨慎操作。"
      type="warning"
      show-icon
      class="mb-4"
    />
    
    <Form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      name="fieldForm"
    >
      <Tabs v-model:activeKey="activeKey">
        <Tabs.TabPane key="basic" tab="基本信息">
          <Row :gutter="16">
            <Col :span="12">
              <Form.Item name="dbFieldName" label="数据库字段名">
                <Input 
                  v-model:value="formState.dbFieldName" 
                  placeholder="如: Field_Name" 
                  :disabled="isEdit && !formState.isViewField" 
                  allow-clear
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item name="entityFieldName" label="实体字段名">
                <Input 
                  v-model:value="formState.entityFieldName" 
                  placeholder="如: fieldName"
                  allow-clear
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row :gutter="16">
            <Col :span="12">
              <Form.Item name="fieldLabel" label="字段显示名称">
                <Input 
                  v-model:value="formState.fieldLabel" 
                  placeholder="用户界面显示的名称"
                  allow-clear
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item name="controlType" label="控件类型">
                <Select v-model:value="formState.controlType">
                  <Select.Option value="input">输入框</Select.Option>
                  <Select.Option value="textarea">多行文本</Select.Option>
                  <Select.Option value="number">数字输入框</Select.Option>
                  <Select.Option value="select">下拉选择器</Select.Option>
                  <Select.Option value="date">日期选择器</Select.Option>
                  <Select.Option value="datetime">日期时间选择器</Select.Option>
                  <Select.Option value="checkbox">复选框</Select.Option>
                  <Select.Option value="radio">单选框</Select.Option>
                  <Select.Option value="switch">开关</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row :gutter="16">
            <Col :span="12">
              <Form.Item name="fieldType" label="数据库字段类型">
                <Select 
                  v-model:value="formState.fieldType" 
                  :options="getDbFieldTypeOptions()"
                  placeholder="选择数据库字段类型"
                  :disabled="isEdit && !formState.isViewField"
                />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item v-if="isStringType" name="fieldLength" label="字段长度">
                <Input 
                  v-model:value="formState.fieldLength" 
                  type="number"
                  :min="1"
                  :max="4000"
                  placeholder="请输入字段长度"
                />
                <span class="ml-2 text-gray">字符串类型字段的长度</span>
              </Form.Item>
            </Col>
          </Row>
          
          <Row :gutter="16">
            <Col :span="12">
              <Form.Item name="isViewField" label="视图字段">
                <Switch 
                  v-model:checked="formState.isViewField" 
                  :checkedValue="true"
                  :unCheckedValue="false"
                />
                <span class="ml-2 text-gray">视图字段不会映射到数据库</span>
              </Form.Item>
            </Col>
          </Row>
          
          <Row :gutter="16">
            <Col :span="12">
              <Form.Item name="isRequired" label="必填字段">
                <Switch 
                  v-model:checked="formState.isRequired" 
                  :checkedValue="true"
                  :unCheckedValue="false"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="defaultValue" label="默认值">
            <Input 
              v-model:value="formState.defaultValue" 
              placeholder="字段默认值"
              allow-clear
            />
          </Form.Item>
          
          <Form.Item name="description" label="字段描述">
            <Input.TextArea 
              v-model:value="formState.description" 
              placeholder="字段的详细描述"
              :rows="2"
            />
          </Form.Item>
        </Tabs.TabPane>
        
        <Tabs.TabPane key="validation" tab="验证与格式">
          <div v-if="isNumberType" class="mb-4">
            <Alert message="数值类型附加验证" type="info" show-icon />
            
            <Row class="mt-4" :gutter="16">
              <Col :span="12">
                <Form.Item name="nonNegative" label="非负数">
                  <Switch 
                    v-model:checked="formState.nonNegative" 
                    :checkedValue="true"
                    :unCheckedValue="false"
                  />
                  <span class="ml-2 text-gray">值不能小于0</span>
                </Form.Item>
              </Col>
              <Col :span="12">
                <Form.Item name="nonZero" label="非零">
                  <Switch 
                    v-model:checked="formState.nonZero" 
                    :checkedValue="true"
                    :unCheckedValue="false"
                  />
                  <span class="ml-2 text-gray">值不能等于0</span>
                </Form.Item>
              </Col>
            </Row>
            
            <Row :gutter="16">
              <Col :span="12">
                <Form.Item name="minValue" label="最小值">
                  <Input 
                    v-model:value="formState.minValue" 
                    placeholder="不设置则无限制"
                    allow-clear
                    type="number"
                  />
                </Form.Item>
              </Col>
              <Col :span="12">
                <Form.Item name="maxValue" label="最大值">
                  <Input 
                    v-model:value="formState.maxValue" 
                    placeholder="不设置则无限制"
                    allow-clear
                    type="number"
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row :gutter="16">
              <Col :span="12">
                <Form.Item name="precision" label="精度(小数位数)">
                  <Input 
                    v-model:value="formState.precision" 
                    placeholder="默认2位小数"
                    type="number"
                    :min="0"
                    :max="10"
                  />
                </Form.Item>
              </Col>
              <Col :span="12">
                <Form.Item name="isPercentageStyle" label="百分比样式">
                  <Switch 
                    v-model:checked="formState.isPercentageStyle" 
                    :checkedValue="true"
                    :unCheckedValue="false"
                  />
                  <span class="ml-2 text-gray">显示为百分比形式</span>
                </Form.Item>
              </Col>
            </Row>
          </div>
          
          <div v-if="formState.fieldType === 'Bit' || formState.fieldType === 'Boolean'" class="mb-4">
            <Form.Item name="isCheckboxStyle" label="勾选样式">
              <Switch 
                v-model:checked="formState.isCheckboxStyle" 
                :checkedValue="true"
                :unCheckedValue="false"
              />
              <span class="ml-2 text-gray">使用复选框样式显示</span>
            </Form.Item>
          </div>
          
          <Form.Item v-if="!isNumberType && formState.fieldType !== 'Bit' && formState.fieldType !== 'Boolean'" name="placeholder" label="占位文本">
            <Input 
              v-model:value="formState.placeholder" 
              placeholder="输入框的提示文本"
              allow-clear
            />
          </Form.Item>
        </Tabs.TabPane>
        
        <Tabs.TabPane key="advanced" tab="高级设置">
          <Form.Item name="orderNo" label="排序号">
            <Input 
              v-model:value="formState.orderNo" 
              type="number"
              :min="0"
            />
          </Form.Item>
          
          <Form.Item name="controlType" label="控件类型">
            <Select v-model:value="formState.controlType">
              <Select.Option value="input">输入框</Select.Option>
              <Select.Option value="textarea">多行文本</Select.Option>
              <Select.Option value="number">数字输入框</Select.Option>
              <Select.Option value="select">下拉选择器</Select.Option>
              <Select.Option value="date">日期选择器</Select.Option>
              <Select.Option value="datetime">日期时间选择器</Select.Option>
              <Select.Option value="checkbox">复选框</Select.Option>
              <Select.Option value="radio">单选框</Select.Option>
              <Select.Option value="switch">开关</Select.Option>
            </Select>
          </Form.Item>
        </Tabs.TabPane>
      </Tabs>
    </Form>
  </Modal>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.text-gray {
  color: #8c8c8c;
}
</style> 
