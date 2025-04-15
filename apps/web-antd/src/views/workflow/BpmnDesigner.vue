<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';

import {
  DownloadOutlined,
  FolderOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';
import { Button, message, Space, Upload } from 'ant-design-vue';
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

export default defineComponent({
  name: 'BpmnDesigner',
  components: {
    AButton: Button,
    ASpace: Space,
    AUpload: Upload,
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

    // BPMN建模器实例
    let bpmnModeler: any = null;

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
      saveProcess,
      downloadXml,
      importXml,
      handleBeforeUpload,
    };
  },
});
</script>

<template>
  <div class="bpmn-designer-container">
    <div class="toolbar">
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
    </div>
    <div class="content">
      <div ref="canvasRef" class="canvas"></div>
      <div ref="panelRef" class="panel"></div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.bpmn-designer-container {
  display: flex;
  flex-direction: column;
  height: 100%;

  .toolbar {
    padding: 8px;
    background-color: #f0f2f5;
    border-bottom: 1px solid #e8e8e8;
  }

  .content {
    display: flex;
    flex: 1;
    overflow: hidden;

    .canvas {
      flex: 1;
      height: 100%;
      border-right: 1px solid #e8e8e8;
    }

    .panel {
      width: 300px;
      height: 100%;
      overflow: auto;
    }
  }
}
</style>
