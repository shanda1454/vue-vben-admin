<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';

import {
  DownloadOutlined,
  FolderOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';
import { Button, Card, message, Space, Upload } from 'ant-design-vue';
// 导入属性面板模块
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from 'bpmn-js-properties-panel';
import BpmnModeler from 'bpmn-js/lib/Modeler';

// 导入样式
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

// 导入主题相关
import { preferences, usePreferences } from '@vben/preferences';

export default defineComponent({
  name: 'BpmnDesigner',
  components: {
    AButton: Button,
    ASpace: Space,
    AUpload: Upload,
    ACard: Card,
    SaveOutlined,
    DownloadOutlined,
    UploadOutlined,
    FolderOutlined,
  },
  setup() {
    // 初始BPMN XML
    const INITIAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
    <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                      xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                      xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                      xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                      xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                      id="Definitions_1" 
                      targetNamespace="http://bpmn.io/schema/bpmn">
      <bpmn:process id="Process_1" isExecutable="false">
        <bpmn:startEvent id="StartEvent_1" name="开始"/>
      </bpmn:process>
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
        <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
          <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
            <dc:Bounds height="36.0" width="36.0" x="173.0" y="102.0"/>
          </bpmndi:BPMNShape>
        </bpmndi:BPMNPlane>
      </bpmndi:BPMNDiagram>
    </bpmn:definitions>`;

    // 引用DOM元素
    const canvasRef = ref();
    const panelRef = ref();
    const uploadRef = ref();
    const containerRef = ref();

    // 获取主题信息
    const { isDark } = usePreferences();

    // BPMN建模器实例
    let bpmnModeler: any = null;

    // 监听主题变化
    watch(
      () => isDark.value,
      () => {
        // 如果建模器已初始化，需要更新样式
        if (bpmnModeler && containerRef.value) {
          applyThemeStyles();
        }
      },
    );

    // 应用主题样式
    const applyThemeStyles = () => {
      if (!containerRef.value) return;

      const container = containerRef.value;
      
      // 应用暗色主题或亮色主题样式
      if (isDark.value) {
        container.classList.add('bpmn-dark-theme');
      } else {
        container.classList.remove('bpmn-dark-theme');
      }
    };

    // 初始化BPMN建模器
    const initBpmnModeler = () => {
      if (bpmnModeler) return;

      bpmnModeler = new BpmnModeler({
        container: canvasRef.value,
        propertiesPanel: {
          parent: panelRef.value,
        },
        additionalModules: [
          BpmnPropertiesPanelModule,
          BpmnPropertiesProviderModule,
        ],
      });

      // 导入初始图表
      importBpmnDiagram(INITIAL_XML);
      
      // 应用当前主题样式
      applyThemeStyles();
    };

    // 导入BPMN图表
    const importBpmnDiagram = async (xml: string) => {
      try {
        await bpmnModeler.importXML(xml);
        bpmnModeler.get('canvas').zoom('fit-viewport');
        message.success('流程图导入成功');
      } catch (error) {
        console.error('导入BPMN图表失败', error);
        message.error('流程图导入失败');
      }
    };

    // 保存流程
    const saveProcess = async () => {
      try {
        const { xml } = await bpmnModeler.saveXML({ format: true });
        console.log('保存的XML', xml);
        // 这里可以添加将XML发送到后端的逻辑
        message.success('流程保存成功');
      } catch (error) {
        console.error('保存流程失败', error);
        message.error('流程保存失败');
      }
    };

    // 下载XML
    const downloadXml = async () => {
      try {
        const { xml } = await bpmnModeler.saveXML({ format: true });
        const blob = new Blob([xml], { type: 'application/xml' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `流程定义_${Date.now()}.bpmn`;
        document.body.append(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error('下载XML失败', error);
        message.error('下载XML失败');
      }
    };

    // 导入XML
    const importXml = () => {
      uploadRef.value.upload.click();
    };

    // 上传前处理文件
    const handleBeforeUpload = (file: File) => {
      const reader = new FileReader();
      reader.addEventListener('load', (e) => {
        const xml = e.target?.result as string;
        importBpmnDiagram(xml);
      });
      reader.readAsText(file);
      return false;
    };

    // 组件挂载时初始化BPMN建模器
    onMounted(() => {
      initBpmnModeler();
    });

    // 组件卸载时销毁BPMN建模器
    onUnmounted(() => {
      if (bpmnModeler) {
        bpmnModeler.destroy();
        bpmnModeler = null;
      }
    });

    return {
      canvasRef,
      panelRef,
      uploadRef,
      containerRef,
      saveProcess,
      downloadXml,
      importXml,
      handleBeforeUpload,
      isDark,
    };
  },
});
</script>

<template>
  <div class="bpmn-designer-container" ref="containerRef">
    <ACard :bordered="false" class="mb-4">
      <ASpace>
        <AButton type="primary" @click="saveProcess">
          <template #icon><SaveOutlined /></template>
          保存流程
        </AButton>
        <AButton @click="downloadXml">
          <template #icon><DownloadOutlined /></template>
          下载XML
        </AButton>
        <AButton @click="importXml">
          <template #icon><UploadOutlined /></template>
          导入XML
        </AButton>
        <AUpload
          ref="uploadRef"
          :show-upload-list="false"
          accept=".bpmn, .xml"
          :before-upload="handleBeforeUpload"
          :multiple="false"
        >
          <AButton>
            <template #icon><FolderOutlined /></template>
            打开文件
          </AButton>
        </AUpload>
      </ASpace>
    </ACard>
    <div class="bpmn-content">
      <div ref="canvasRef" class="bpmn-canvas"></div>
      <div ref="panelRef" class="bpmn-panel"></div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.bpmn-designer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  .bpmn-content {
    display: flex;
    flex: 1;
    overflow: hidden;
    border-radius: var(--radius);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);

    .bpmn-canvas {
      flex: 1;
      height: 100%;
      background-color: hsl(var(--card));
      border-right: 1px solid hsl(var(--border));
    }

    .bpmn-panel {
      width: 300px;
      height: 100%;
      overflow: auto;
      background-color: hsl(var(--card));
      border-left: 1px solid hsl(var(--border));
    }
  }
}

:deep(.djs-palette) {
  background-color: hsl(var(--card)) !important;
  border-color: hsl(var(--border)) !important;
}

:deep(.djs-palette-entries) {
  border-color: hsl(var(--border)) !important;
}

:deep(.djs-context-pad) {
  background-color: hsl(var(--card)) !important;
  border-color: hsl(var(--border)) !important;
}

:deep(.djs-popup-header) {
  background-color: hsl(var(--card)) !important;
  color: hsl(var(--foreground)) !important;
}

:deep(.djs-popup-body) {
  background-color: hsl(var(--card)) !important;
  border-color: hsl(var(--border)) !important;
}

:deep(.djs-popup-body .entry) {
  color: hsl(var(--foreground)) !important;
}

:deep(.djs-popup-body .entry:hover) {
  background-color: hsl(var(--accent-hover)) !important;
}

:deep(.bpp-properties-panel) {
  background-color: hsl(var(--card)) !important;
  border-color: hsl(var(--border)) !important;
  color: hsl(var(--foreground)) !important;
}

:deep(.bpp-properties-header) {
  background-color: hsl(var(--secondary)) !important;
  color: hsl(var(--secondary-foreground)) !important;
  border-color: hsl(var(--border)) !important;
}

:deep(.bpp-properties-tab-bar) {
  background-color: hsl(var(--accent)) !important;
  border-color: hsl(var(--border)) !important;
}

:deep(.bpp-properties-tabs-links li.bpp-active a) {
  border-color: hsl(var(--primary)) !important;
  color: hsl(var(--primary)) !important;
}

:deep(.bpp-properties-group) {
  border-color: hsl(var(--border)) !important;
}

:deep(.bpp-properties-entry input, .bpp-properties-entry select, .bpp-properties-entry textarea) {
  background-color: hsl(var(--input-background)) !important;
  border-color: hsl(var(--input)) !important;
  color: hsl(var(--foreground)) !important;
}

// 暗黑主题特殊样式
.bpmn-dark-theme {
  :deep(.djs-palette) {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5) !important;
  }
  
  :deep(.djs-palette-entries .entry) {
    color: hsl(var(--foreground)) !important;
    
    &:hover {
      background-color: hsl(var(--accent-hover)) !important;
      color: hsl(var(--foreground)) !important;
    }
    
    // 确保SVG图标在暗色模式下可见
    svg, path, polyline, circle, rect, polygon {
      fill: hsl(var(--foreground)) !important;
      stroke: hsl(var(--foreground)) !important;
    }
  }
  
  :deep(.djs-container svg) {
    // 给SVG元素添加反色滤镜
    background-color: hsl(var(--background-deep)) !important;
  }
  
  // 调整BPMN工具图标颜色
  :deep(.djs-palette-toggle) {
    fill: hsl(var(--foreground)) !important;
  }
  
  :deep(.djs-context-pad .entry) {
    background-color: hsl(var(--card)) !important;
    color: hsl(var(--foreground)) !important;
    border-color: hsl(var(--border)) !important;
    
    // 确保上下文菜单图标在暗色模式下可见
    svg, path, polyline, circle, rect, polygon {
      fill: hsl(var(--foreground)) !important;
      stroke: hsl(var(--foreground)) !important;
    }
  }
  
  // 修改BPMN图形颜色 - 增强对比度
  :deep(.djs-container .djs-shape .djs-visual > :not(.djs-label)) {
    fill: hsl(var(--accent-dark)) !important; // 使用暗色主题的强调色作为填充
    stroke: hsl(var(--foreground)) !important; // 使用前景色（通常是白色）作为边框
    stroke-width: 1.5px !important; // 加粗边框以增强可见性
  }
  
  // 显式处理所有BPMN元素类型
  :deep(.djs-container .bpmn-icon-task,
         .djs-container .bpmn-icon-start-event,
         .djs-container .bpmn-icon-end-event,
         .djs-container .bpmn-icon-intermediate-event,
         .djs-container .bpmn-icon-gateway-none,
         .djs-container .bpmn-icon-gateway-parallel,
         .djs-container .bpmn-icon-gateway-xor,
         .djs-container .bpmn-icon-gateway-or,
         .djs-container .bpmn-icon-gateway-complex,
         .djs-container .bpmn-icon-gateway-eventbased,
         .djs-container .bpmn-icon-subprocess-expanded,
         .djs-container .bpmn-icon-data-object,
         .djs-container .bpmn-icon-data-store,
         .djs-container .bpmn-icon-participant,
         .djs-container .bpmn-icon-group,
         .djs-container .bpmn-icon-text-annotation) {
    fill: hsl(var(--foreground)) !important;
    stroke: hsl(var(--foreground)) !important;
  }
  
  // 修复开始事件、结束事件等圆形节点
  :deep(.djs-container .djs-shape[data-element-id*="StartEvent"] .djs-visual circle,
         .djs-container .djs-shape[data-element-id*="EndEvent"] .djs-visual circle,
         .djs-container .djs-shape[data-element-id*="IntermediateEvent"] .djs-visual circle) {
    stroke: hsl(var(--foreground)) !important;
    stroke-width: 2px !important;
    fill: transparent !important; // 圆圈内部透明
  }
  
  // 特别修复开始事件
  :deep(.djs-container .djs-shape[data-element-id*="StartEvent"] .djs-visual circle) {
    fill: transparent !important;
    stroke: hsl(var(--primary)) !important; // 突出显示开始事件
  }
  
  // 特别修复结束事件
  :deep(.djs-container .djs-shape[data-element-id*="EndEvent"] .djs-visual circle) {
    fill: transparent !important;
    stroke: hsl(var(--destructive)) !important; // 使用破坏性颜色突出显示结束事件
    stroke-width: 3px !important;
  }
  
  // 修复任务节点
  :deep(.djs-container .djs-shape[data-element-id*="Task"] .djs-visual rect) {
    fill: hsl(var(--card)) !important;
    stroke: hsl(var(--foreground)) !important;
    stroke-width: 2px !important;
  }
  
  // 修复网关
  :deep(.djs-container .djs-shape[data-element-id*="Gateway"] .djs-visual polygon) {
    fill: hsl(var(--card)) !important;
    stroke: hsl(var(--foreground)) !important;
    stroke-width: 2px !important;
  }
  
  // 修复所有连接线
  :deep(.djs-container .djs-connection .djs-visual path) {
    stroke: hsl(var(--foreground)) !important;
    stroke-width: 1.5px !important;
  }
  
  // 确保所有标签文本可见
  :deep(.djs-container .djs-label) {
    fill: hsl(var(--foreground)) !important;
    color: hsl(var(--foreground)) !important;
  }
  
  // 修复定制图标和元素内部的细节
  :deep(.djs-container .djs-visual-content) {
    path, circle, rect, polygon, polyline {
      stroke: hsl(var(--foreground)) !important;
      fill: transparent !important; // 使内部图标透明但边框可见
    }
  }
  
  // 覆盖任何子元素图标以确保可见性
  :deep(.djs-container .djs-shape .djs-visual path) {
    stroke: hsl(var(--foreground)) !important;
    fill: transparent !important;
  }
  
  // 修改选中效果
  :deep(.djs-container .selected .djs-outline) {
    stroke: hsl(var(--primary)) !important;
  }
  
  // 修改连接线箭头颜色
  :deep(.djs-container .djs-connection .djs-visual polyline) {
    stroke: hsl(var(--foreground)) !important;
    fill: hsl(var(--foreground)) !important;
  }
  
  // 修改小工具控制点颜色
  :deep(.djs-bendpoint, .djs-segment-dragger) {
    fill: hsl(var(--primary)) !important;
    stroke: hsl(var(--border)) !important;
  }
  
  :deep(.bpp-properties-header) {
    background-color: hsl(var(--accent-dark)) !important;
  }
  
  // 修改弹出框样式，确保图标和文字可见
  :deep(.djs-popup) {
    background-color: hsl(var(--card)) !important;
    border-color: hsl(var(--border)) !important;
    
    .entry {
      color: hsl(var(--foreground)) !important;
      
      svg, path, polyline, circle, rect, polygon {
        fill: hsl(var(--foreground)) !important;
        stroke: hsl(var(--foreground)) !important;
      }
      
      &:hover {
        background-color: hsl(var(--accent-hover)) !important;
      }
    }
  }
  
  // 修改对齐线颜色
  :deep(.djs-snap-line) {
    stroke: hsl(var(--primary)) !important;
  }
  
  // 修复双击编辑文本时的文本框样式
  :deep(.djs-direct-editing-content) {
    background-color: hsl(var(--card)) !important;
    border: 2px solid hsl(var(--border)) !important;
    color: hsl(var(--foreground)) !important;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5) !important;
  }
  
  // 修复文本编辑区域的样式
  :deep(.djs-direct-editing-parent) {
    .djs-direct-editing-content {
      background-color: hsl(var(--card)) !important;
      color: hsl(var(--foreground)) !important;
    }
  }
  
  // 修复文本输入框
  :deep(textarea.djs-direct-editing-content),
  :deep(input.djs-direct-editing-content) {
    background-color: hsl(var(--card)) !important;
    color: hsl(var(--foreground)) !important;
    border: 1px solid hsl(var(--border)) !important;
  }
}
</style>
