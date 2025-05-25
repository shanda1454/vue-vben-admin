<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import { Modal, Button, message, Spin } from 'ant-design-vue';
import FieldConfig from './FieldConfig.vue';

// 定义属性，同时支持visible和open
const props = defineProps<{
  formId?: number;
  formName?: string;
  visible?: boolean;
  open?: boolean;
}>();

// 同时支持visible和open事件
const emit = defineEmits<{
  'update:visible': [value: boolean];
  'update:open': [value: boolean];
  'close': [];
}>();

// 内部状态
const isVisible = ref(false);
const formIdRef = ref<number | undefined>(undefined);
const loading = ref(false);

// 监听属性变化
watch(() => props.visible, (val) => {
  if (val !== undefined) {
    isVisible.value = val;
    if (val) {
      loading.value = true;
      // 模拟短暂加载状态，提升用户体验
      setTimeout(() => {
        loading.value = false;
      }, 800);
    }
  }
}, { immediate: true });

watch(() => props.open, (val) => {
  if (val !== undefined) {
    isVisible.value = val;
    if (val) {
      loading.value = true;
      // 模拟短暂加载状态，提升用户体验
      setTimeout(() => {
        loading.value = false;
      }, 800);
    }
  }
}, { immediate: true });

// 监听formId变化
watch(() => props.formId, (val) => {
  if (val !== undefined && !isNaN(Number(val))) {
    formIdRef.value = Number(val);
    console.log('FieldAdapter - formId变更为:', formIdRef.value);
  } else {
    console.warn('FieldAdapter - 无效的formId:', val);
  }
}, { immediate: true });

// 关闭处理
function handleClose() {
  isVisible.value = false;
  emit('update:visible', false);
  emit('update:open', false);
  emit('close');
}

// 监听内部状态变化
watch(isVisible, (val) => {
  emit('update:visible', val);
  emit('update:open', val);
  if (val && props.formId) {
    // 每次打开时确保formId正确
    formIdRef.value = Number(props.formId);
    console.log('FieldAdapter - 打开弹窗，formId:', formIdRef.value);
    loading.value = true;
    // 模拟短暂加载状态，提升用户体验
    setTimeout(() => {
      loading.value = false;
    }, 800);
  }
});

onMounted(() => {
  if (props.formId) {
    formIdRef.value = Number(props.formId);
    console.log('FieldAdapter - 组件挂载，formId:', formIdRef.value);
  }
});
</script>

<template>
  <Modal 
    :open="isVisible" 
    title="字段维护" 
    width="80%"
    :footer="null" 
    @cancel="handleClose"
    destroyOnClose
    :bodyStyle="{
      maxHeight: 'calc(90vh - 140px)',
      overflow: 'auto',
      paddingBottom: '20px'
    }"
    :style="{ top: '20px' }"
    :zIndex="1001"
    wrapClassName="field-adapter-modal"
  >
    <div v-if="!formIdRef" class="field-adapter-container empty-container">
      <div class="empty-message">
        无效的表单ID，请重新选择表单
      </div>
    </div>
    <div v-else-if="loading" class="field-adapter-container loading-container">
      <Spin tip="加载中..." size="large">
        <div class="loading-content">
          <div class="loading-placeholder"></div>
        </div>
      </Spin>
    </div>
    <div v-else class="field-adapter-container">
      <FieldConfig
        v-if="isVisible && formIdRef"
        :formId="formIdRef"
        :formName="props.formName || ''"
        @close="handleClose"
      />
    </div>
  </Modal>
</template> 

<style scoped>
:deep(.ant-modal-body) {
  position: relative;
  max-height: calc(90vh - 120px);
  overflow: auto;
}

:deep(.ant-modal) {
  position: relative;
  height: auto !important;
  max-height: calc(90vh) !important;
  overflow: hidden;
}

:deep(.ant-modal-content) {
  position: relative;
  max-height: calc(90vh - 40px) !important;
  overflow: hidden;
}

:deep(.ant-modal-mask) {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

:deep(.ant-modal-wrap) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 1001;
  height: 100vh !important;
  max-height: 100vh !important;
  overflow: hidden !important;
  outline: 0;
}

.field-adapter-container {
  position: relative;
  height: calc(90vh - 200px);
  max-height: calc(90vh - 200px);
  overflow: hidden;
}

.empty-container, .loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-message {
  padding: 24px;
  font-size: 16px;
  color: #ff4d4f;
  text-align: center;
  background-color: #fff2f0;
  border-radius: 4px;
}

.loading-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 400px;
}

.loading-placeholder {
  width: 100%;
  height: 100%;
  background: rgb(0 0 0 / 2%);
  border-radius: 4px;
}

:deep(.ant-spin) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  max-height: 500px;
}

:deep(.ant-spin-dot) {
  font-size: 32px;
}

:deep(.ant-spin-text) {
  margin-top: 16px;
  font-size: 16px;
  color: #1890ff;
}

/* 确保模态框不会导致页面变长 */
:deep(.field-adapter-modal) {
  position: fixed !important;
  inset: 0 !important;
  height: 100vh !important;
  max-height: 100vh !important;
  overflow: hidden !important;
}
</style> 
