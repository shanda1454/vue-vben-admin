// @ts-nocheck /* eslint-disable */
<script lang="ts">
// camunda 翻译
import { bpmnTranslations } from '#/locales/lang/zh-CN/bpmnTranslations';
// 移除类型导入，直接使用值导入
import {
  defineComponent,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue';

// 仅保留框架内置国际化
import { useI18n } from '@vben/locales';
// 导入主题相关
import { usePreferences } from '@vben/preferences';

// 导入自定义模块
import CustomThemePropertiesProvider from './CustomPropertiesProvider';
import CustomDocumentProvider from './CustomDocumentProvider';
import VbenThemeAdapterModule from './VbenThemeAdapter';
import ThemeModule from './ThemeModule';

// 导入创建追加任何元素模块
import { CreateAppendAnythingModule } from 'bpmn-js-create-append-anything';

import {
  DownloadOutlined,
  FolderOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Divider,
  message,
  Select,
  Space,
  Upload,
} from 'ant-design-vue';
// 导入属性面板模块
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  // @ts-ignore 抑制类型错误，保留功能
  CamundaPlatformPropertiesProviderModule, // 新增Camunda平台属性提供器
} from 'bpmn-js-properties-panel';
// 导入BPMN模块化类
import BpmnModeler from 'bpmn-js/lib/Modeler';
// 导入缩略图
import minimapModule from 'diagram-js-minimap';

// 导入Camunda行为模块
import camundaPlatformBehaviors from 'camunda-bpmn-js-behaviors/lib/camunda-platform';

// 导入Camunda模型描述符
import camundaModdleDescriptor from 'camunda-bpmn-moddle/resources/camunda.json';

// 导入Ant Design国际化 - 作为唯一的语言源
import { antdLocale } from '#/locales';

// 导入样式
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import 'diagram-js-minimap/assets/diagram-js-minimap.css';
import './bpmn-theme.less'; // 导入BPMN主题样式

// 基础类型声明
interface BpmnTranslations {
  [locale: string]: {
    [key: string]: string;
  };
}

// 添加全局错误处理以消除特定警告 - 错误抑制模块
(function () {
  // 替换 console.warn 来屏蔽特定警告
  const originalWarn = console.warn;
  console.warn = function (...args) {
    // 检查是否是关于ContextPad#getPad的弃用警告
    if (
      args.length > 0 &&
      typeof args[0] === 'string' &&
      args[0].includes('ContextPad#getPad is deprecated')
    ) {
      return; // 忽略此警告
    }
    return originalWarn.apply(console, args);
  };

  // 添加全局错误处理器
  window.addEventListener(
    'error',
    (event) => {
      // 检查是否是ContextPad#getPad相关的错误
      if (
        event &&
        event.error &&
        event.error.message &&
        event.error.message.includes('ContextPad#getPad is deprecated')
      ) {
        // 阻止默认处理
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    },
    true,
  );
})();

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
    ADivider: Divider,
    ASelect: Select,
  },
  setup() {

    

    // 国际化
    const { t: originalT } = useI18n();

    // 翻译函数
    const t = (key: string, args: any[] = []): string => {
      try {
        // 确保正确的键名路径
        // 如果key已经包含workflow前缀，则直接使用
        const fullKey = key.startsWith('workflow.') ? key : `workflow.${key}`;
        const result = originalT(fullKey, args);

        // 如果返回结果是对象或undefined，尝试使用原始键
        if (typeof result !== 'string' || result === fullKey) {
          return originalT(key, args) || key;
        }

        return result;
      } catch (error) {
        console.error(`翻译错误 [${key}]:`, error);
        // 出错时返回原始键
        return key.split('.').pop() || key;
      }
    };

    // 改用antdLocale作为唯一语言源
    const currentLocale = ref('zh'); // 默认中文

    // 初始化时确定当前语言
    try {
      const locale = antdLocale.value?.locale;
      currentLocale.value = locale === 'en_US' ? 'en' : 'zh';
    } catch (error) {
      console.error('获取初始语言失败:', error);
    }

    // 引用DOM元素
    const canvasRef = ref();
    const panelRef = ref();
    const uploadRef = ref();
    const containerRef = ref();

    // 获取主题信息
    const { isDark } = usePreferences();

    // 栅格配置
    const gridConfig = reactive({
      enabled: true,
      size: 40,
    });

    // BPMN建模器实例
    let bpmnModeler: BpmnModeler | null = null;

    // 初始BPMN XML
    const INITIAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:modeler="http://camunda.org/schema/modeler/1.0" id="Definitions_0l6gbqg" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Modeler" exporterVersion="5.34.0" modeler:executionPlatform="Camunda Platform" modeler:executionPlatformVersion="7.23.0">
  <bpmn:process id="Process_19ivoda" name="付款审批" isExecutable="true" camunda:historyTimeToLive="30">
    <bpmn:startEvent id="StartEvent_1" name="开始&#10;">
      <bpmn:outgoing>Flow_0qcvi02</bpmn:outgoing>
        </bpmn:startEvent>
    <bpmn:endEvent id="Event_1grxn71" name="结束">
      <bpmn:incoming>Flow_1v4dtkv</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:serviceTask id="Activity_0y1rk9g" name="银行付款" camunda:type="external" camunda:topic="charge-card">
      <bpmn:incoming>Flow_1wlgq9o</bpmn:incoming>
      <bpmn:incoming>Flow_0pgamj0</bpmn:incoming>
      <bpmn:outgoing>Flow_1v4dtkv</bpmn:outgoing>
        </bpmn:serviceTask>
    <bpmn:sequenceFlow id="Flow_1v4dtkv" sourceRef="Activity_0y1rk9g" targetRef="Event_1grxn71" />
    <bpmn:userTask id="Activity_1ven1ed" name="付款审批" camunda:formRef="payment-form" camunda:formRefBinding="latest" camunda:assignee="demo">
      <bpmn:extensionElements />
      <bpmn:incoming>Flow_07txbub</bpmn:incoming>
      <bpmn:outgoing>Flow_1bbjqku</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:exclusiveGateway id="Gateway_1khp7yp">
      <bpmn:incoming>Flow_0qcvi02</bpmn:incoming>
      <bpmn:outgoing>Flow_1wlgq9o</bpmn:outgoing>
      <bpmn:outgoing>Flow_07txbub</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:sequenceFlow id="Flow_0qcvi02" sourceRef="StartEvent_1" targetRef="Gateway_1khp7yp" />
    <bpmn:sequenceFlow id="Flow_1wlgq9o" name="&#60;1000" sourceRef="Gateway_1khp7yp" targetRef="Activity_0y1rk9g">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">\${amount &lt; 1000 || item != '采购1'}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:exclusiveGateway id="Gateway_0nbwlun">
      <bpmn:incoming>Flow_1bbjqku</bpmn:incoming>
      <bpmn:outgoing>Flow_0pgamj0</bpmn:outgoing>
      <bpmn:outgoing>Flow_1h6uora</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:sequenceFlow id="Flow_1bbjqku" sourceRef="Activity_1ven1ed" targetRef="Gateway_0nbwlun" />
    <bpmn:sequenceFlow id="Flow_0pgamj0" name="审批通过" sourceRef="Gateway_0nbwlun" targetRef="Activity_0y1rk9g">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">\${approved}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_07txbub" name="&#62;=1000" sourceRef="Gateway_1khp7yp" targetRef="Activity_1ven1ed">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">\${amount&gt;=1000 &amp;&amp; (item ==  '采购1'  ||  item ==  '采购2')}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:endEvent id="Event_1tnp8dk" name="结束">
      <bpmn:incoming>Flow_1h6uora</bpmn:incoming>
        </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1h6uora" name="审批不通过" sourceRef="Gateway_0nbwlun" targetRef="Event_1tnp8dk">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">\${!approved}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
      </bpmn:process>
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_19ivoda">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="182" y="102" width="36" height="36" />
            <bpmndi:BPMNLabel>
          <dc:Bounds x="189" y="145" width="22" height="27" />
            </bpmndi:BPMNLabel>
          </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_1khp7yp_di" bpmnElement="Gateway_1khp7yp" isMarkerVisible="true">
        <dc:Bounds x="335" y="95" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1q3ksne_di" bpmnElement="Activity_1ven1ed">
        <dc:Bounds x="310" y="290" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_0062fl9_di" bpmnElement="Activity_0y1rk9g">
        <dc:Bounds x="590" y="80" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_1grxn71_di" bpmnElement="Event_1grxn71">
        <dc:Bounds x="892" y="102" width="36" height="36" />
            <bpmndi:BPMNLabel>
          <dc:Bounds x="899" y="145" width="22" height="14" />
            </bpmndi:BPMNLabel>
          </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_0nbwlun_di" bpmnElement="Gateway_0nbwlun" isMarkerVisible="true">
        <dc:Bounds x="615" y="305" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_1tnp8dk_di" bpmnElement="Event_1tnp8dk">
        <dc:Bounds x="892" y="312" width="36" height="36" />
            <bpmndi:BPMNLabel>
          <dc:Bounds x="899" y="355" width="22" height="14" />
            </bpmndi:BPMNLabel>
          </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_0qcvi02_di" bpmnElement="Flow_0qcvi02">
        <di:waypoint x="218" y="120" />
        <di:waypoint x="335" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1v4dtkv_di" bpmnElement="Flow_1v4dtkv">
        <di:waypoint x="690" y="120" />
        <di:waypoint x="892" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1wlgq9o_di" bpmnElement="Flow_1wlgq9o">
        <di:waypoint x="385" y="120" />
        <di:waypoint x="590" y="120" />
            <bpmndi:BPMNLabel>
          <dc:Bounds x="472" y="102" width="31" height="14" />
            </bpmndi:BPMNLabel>
          </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1bbjqku_di" bpmnElement="Flow_1bbjqku">
        <di:waypoint x="410" y="330" />
        <di:waypoint x="615" y="330" />
          </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_0pgamj0_di" bpmnElement="Flow_0pgamj0">
        <di:waypoint x="640" y="305" />
        <di:waypoint x="640" y="160" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="633" y="230" width="44" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_07txbub_di" bpmnElement="Flow_07txbub">
        <di:waypoint x="360" y="145" />
        <di:waypoint x="360" y="290" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="356" y="215" width="38" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1h6uora_di" bpmnElement="Flow_1h6uora">
        <di:waypoint x="665" y="330" />
        <di:waypoint x="892" y="330" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="751" y="312" width="55" height="14" />
        </bpmndi:BPMNLabel>
          </bpmndi:BPMNEdge>
        </bpmndi:BPMNPlane>
      </bpmndi:BPMNDiagram>
    </bpmn:definitions>`;

    // 监听栅格配置变化
    watch(
      () => [gridConfig.enabled, gridConfig.size],
      () => {
        applyGridStyles();
      },
    );

    // 应用栅格样式
    const applyGridStyles = () => {
      if (!canvasRef.value) return;

      const canvas = canvasRef.value;

      if (gridConfig.enabled) {
        // 安全地获取isDark值
        const gridColor = (() => {
          try {
            return isDark?.value
              ? 'rgba(90, 120, 200, 0.2)'
              : 'rgba(128, 128, 128, 0.15)';
          } catch (error) {
            console.error('访问isDark.value时出错:', error);
            return 'rgba(128, 128, 128, 0.15)'; // 默认使用亮色模式的栅格颜色
          }
        })();

        // 创建或获取栅格层元素
        let gridLayer = canvas.querySelector('.bpmn-grid-layer');
        if (!gridLayer) {
          gridLayer = document.createElement('div');
          gridLayer.className = 'bpmn-grid-layer';
          canvas.append(gridLayer);

          // 设置栅格层样式
          gridLayer.style.position = 'absolute';
          gridLayer.style.top = '0';
          gridLayer.style.left = '0';
          gridLayer.style.right = '0';
          gridLayer.style.bottom = '0';
          gridLayer.style.pointerEvents = 'none';
          gridLayer.style.zIndex = '1000';
        }

        // 设置栅格图案
        gridLayer.style.backgroundImage = `
          linear-gradient(to right, ${gridColor} 1px, transparent 1px),
          linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`;
        gridLayer.style.backgroundSize = `${gridConfig.size}px ${gridConfig.size}px`;
      } else {
        // 移除栅格层
        const gridLayer = canvas.querySelector('.bpmn-grid-layer');
        if (gridLayer) {
          gridLayer.remove();
        }
      }
    };

    // 应用主题样式
    const applyThemeStyles = () => {
      if (!containerRef.value) return;

      const container = containerRef.value;

      // 应用暗色主题或亮色主题样式
      if (isDark?.value) {
        container.classList.add('bpmn-dark-theme');
      } else {
        container.classList.remove('bpmn-dark-theme');
      }

      // 直接应用栅格样式
      applyGridStyles();
    };

    // 切换栅格显示
    const toggleGrid = () => {
      gridConfig.enabled = !gridConfig.enabled;
    };

    // 调整栅格大小
    const adjustGridSize = (size: number) => {
      gridConfig.size = size;
    };

    // 监听antdLocale变化自动更新BPMN设计器语言
    watch(
      antdLocale,
      (newLocale) => {
        try {
          if (!newLocale) return;

          const isNewLocaleEn = newLocale.locale === 'en';

          // 映射到BPMN支持的格式
          const bpmnLocale = isNewLocaleEn ? 'en' : 'zh';

          // 只有当语言发生变化时才更新
          if (currentLocale.value !== bpmnLocale) {
            // 更新当前语言变量
            currentLocale.value = bpmnLocale;

            // 确保BpmnModeler已初始化
            if (bpmnModeler) {
              try {
                // 首先尝试使用translate模块（一定存在）
                const translate = bpmnModeler.get('translate');
                let changeSuccess = false;

                if (
                  translate &&
                  typeof translate.changeLanguage === 'function'
                ) {
                  translate.changeLanguage(bpmnLocale);
                  changeSuccess = true;

                  // 强制重绘 - 使用更安全的方法处理SVG刷新
                  const canvas = bpmnModeler.get('canvas');
                  if (canvas) {
                    try {
                      // 使用安全的方法刷新视图，避免访问createSVGMatrix
                      if (canvas._viewport) {
                        // 使用更安全的刷新方法 - 避免直接调用内部方法
                        // 获取当前视图状态
                        const viewbox = canvas.viewbox();

                        // 触发视图变化事件
                        const eventBus = bpmnModeler.get('eventBus');
                        if (eventBus) {
                          // 先触发一个小的变化，然后恢复
                          const tempViewbox = {
                            ...viewbox,
                            scale: viewbox.scale * 0.999,
                          };
                          eventBus.fire('canvas.viewbox.changing', {
                            viewbox: tempViewbox,
                          });
                          setTimeout(() => {
                            eventBus.fire('canvas.viewbox.changed', {
                              viewbox,
                            });
                          }, 10);
                        }
                      } else {
                        // 备用方法：尝试触发其他事件来刷新
                        const eventBus = bpmnModeler.get('eventBus');
                        if (eventBus) {
                          eventBus.fire('diagram.refresh');
                          eventBus.fire('render.shape');
                          eventBus.fire('render.connection');
                        }
                      }
                    } catch (zoomError) {
                      console.warn('视图刷新出错:', zoomError);

                      // 降级处理：尝试使用zoom方法，但增加安全检查
                      try {
                        // 只有在可以安全调用zoom时才调用
                        if (typeof canvas.zoom === 'function') {
                          const canvasContainer = canvas._container;
                          if (canvasContainer) {
                            const svg = canvasContainer.querySelector('svg');
                            if (svg) {
                              // 安全的方式调用zoom
                              canvas.zoom('fit-viewport', 'auto');
                            }
                          }
                        }
                      } catch (error) {
                        console.warn('降级刷新方法也失败:', error);
                      }
                    }
                  }
                }

                // 然后尝试使用i18n模块（可能不存在）
                try {
                  const i18n = bpmnModeler.get('i18n');
                  if (i18n && typeof i18n.changeLanguage === 'function') {
                    i18n.changeLanguage(bpmnLocale);
                    changeSuccess = true;
                  }
                } catch {
                  // i18n模块不可用，忽略错误
                }

                if (changeSuccess) {
                  // 显示成功消息
                  message.success(
                    `BPMN设计器语言已切换到${bpmnLocale === 'zh' ? '中文' : '英文'}`,
                  );
                } else {
                  console.warn('没有找到可用的语言切换方法');

                  // 尝试重新初始化整个modeler

                  // 保存当前图表并重新初始化
                  bpmnModeler
                    .saveXML({ format: true })
                    .then(({ xml }) => {
                      // 销毁当前modeler
                      bpmnModeler?.destroy();
                      bpmnModeler = null;

                      // 重新初始化
                      setTimeout(() => {
                        initBpmnModeler();

                        // 导入保存的图表
                        setTimeout(() => {
                          if (bpmnModeler) {
                            bpmnModeler.importXML(xml).catch((error) => {
                              console.warn('重新导入图表失败:', error);
                            });
                          }
                        }, 100);
                      }, 100);
                    })
                    .catch((error) => {
                      console.warn('保存当前图表失败:', error);
                    });
                }
              } catch (error) {
                console.warn('切换语言时发生错误:', error);
              }
            }
          }
        } catch (error) {
          console.warn('监听语言变化时出错:', error);
        }
      },
      { immediate: true, deep: true },
    );

    // 在组件挂载时初始化
    onMounted(() => {
      try {
        let xh = 1;
        // 去掉bpmn.io的logo
        const timer = setInterval(() => {
          xh = xh + 1;
          if(xh >= 100)
          {
            clearInterval(timer);
          }
          const logo = document.querySelector('.bjs-powered-by');
          if (logo) {
            logo.remove();
            clearInterval(timer);
          }
        }, 100);
        
        // 初始化BPMN建模器
        initBpmnModeler();

        // 应用栅格样式
        applyGridStyles();
      } catch (error) {
        console.error('组件挂载过程中出错:', error);
      }
    });

    // 注册BPMN事件监听器
    function registerBpmnEventListeners() {
      if (!bpmnModeler) return;

      try {
        // 获取eventBus
        const eventBus = bpmnModeler.get('eventBus');

        if (eventBus) {
          // 监听画布就绪事件
          eventBus.on('canvas.init', () => {
            // 画布初始化完成
          });

          // 监听导入完成事件
          eventBus.on('import.done', () => {
            // 导入完成
          });
        }
      } catch (error) {
        console.error('注册BPMN事件监听器出错:', error);
      }
    }

    // 初始化BPMN建模器
    const initBpmnModeler = () => {
      if (bpmnModeler) return;

      try {
        // 修改自定义translate模块的实现方式，确保正确引用外部变量
        const customTranslateModule = {
          translate: [
            'type',
            function () {
              // 获取当前语言，使用闭包而不是直接引用可能未初始化的变量
              const getCurrentLocale = () => {
                return currentLocale.value || 'zh';
              };

              // 创建translate函数
              function translate(
                template: string,
                replacements?: Record<string, any>,
              ): string {
                const locale = getCurrentLocale();
                const translations =
                  (bpmnTranslations as BpmnTranslations)[locale] || {};

                // 直接查找完全匹配
                if (translations[template]) {
                  return translations[template];
                }

                // 如果有replacements，应用它们
                if (replacements) {
                  return template.replaceAll(
                    /\{([^}]+)\}/g,
                    (_: string, key: string) => {
                      return replacements[key] || `{${key}}`;
                    },
                  );
                }

                // 没有找到翻译时返回原文
                return template;
              }

              // 添加切换语言方法
              translate.changeLanguage = function (locale: string): string {
                console.warn(
                  '[BPMN翻译] 切换语言:',
                  getCurrentLocale(),
                  '->',
                  locale,
                );
                // 更新外部的currentLocale
                if (
                  currentLocale.value !== null &&
                  currentLocale.value !== undefined &&
                  typeof currentLocale.value === 'object' &&
                  'value' in currentLocale.value
                ) {
                  currentLocale.value = locale;
                }
                return locale;
              };

              return translate;
            },
          ],
        };

        // 添加自定义i18n模块，解决"No provider for i18n"错误
        const customI18nModule = {
          i18n: [
            'type',
            function () {
              return {
                _language: currentLocale.value || 'zh',

                // 获取当前语言
                getLanguage() {
                  return this._language;
                },

                // 切换语言方法
                changeLanguage(lang: string) {
                  console.warn(
                    '[BPMN i18n] 切换语言:',
                    this._language,
                    '->',
                    lang,
                  );
                  this._language = lang;

                  // 同步更新外部的currentLocale
                  if (
                    currentLocale.value !== null &&
                    currentLocale.value !== undefined &&
                    typeof currentLocale.value === 'object' &&
                    'value' in currentLocale.value
                  ) {
                    currentLocale.value = lang;
                  }

                  // 返回当前语言
                  return lang;
                },
              };
            },
          ],
        };

        // 添加错误处理模块
        const SilentErrorModule = {
          __init__: ['silentError'],
          silentError: [
            'type',
            function () {
              return {
                silent: true,

                init() {
                  // 修复ContextPad#getPad方法
                  try {
                    setTimeout(() => {
                      const contextPad = bpmnModeler?.get('contextPad');
                      if (contextPad && contextPad.getPad) {
                        // 保存原始方法
                        const originalGetPad = contextPad.getPad;

                        // 替换为不产生警告的版本
                        contextPad.getPad = function (element: any) {
                          const originalWarn = console.warn;
                          console.warn = function () { }; // 临时禁用警告

                          try {
                            const result = originalGetPad.call(this, element);
                            console.warn = originalWarn; // 恢复警告功能
                            return result;
                          } catch {
                            console.warn = originalWarn; // 确保恢复警告功能
                            // 返回一个有效的替代品
                            return { html: document.createElement('div') };
                          }
                        };
                      }
                    }, 200);
                  } catch {
                    // 忽略错误
                  }
                },
              };
            },
          ],
        };

        // 修改初始化BPMN建模器方法，添加i18n模块
        bpmnModeler = new BpmnModeler({
          container: canvasRef.value,
          propertiesPanel: {
            parent: panelRef.value,
          },
          additionalModules: [
            BpmnPropertiesPanelModule,
            BpmnPropertiesProviderModule,
            CamundaPlatformPropertiesProviderModule, // 添加Camunda平台属性提供器模块
            SilentErrorModule, // 添加错误处理模块
            customTranslateModule, // 添加自定义translate模块，替代官方模块
            customI18nModule, // 添加自定义i18n模块
            minimapModule,
            // 自定义主题相关模块
            {
              themePropertiesProvider: ['type', CustomThemePropertiesProvider], // 添加主题属性面板提供器
              documentPropertiesProvider: ['type', CustomDocumentProvider] // 添加单据属性提供器
            },
            VbenThemeAdapterModule, // 添加Vben主题适配器模块
            ThemeModule, // 添加DOM主题变化检测模块
            camundaPlatformBehaviors, // 添加Camunda行为模块
            CreateAppendAnythingModule, // 添加创建追加任何元素模块
          ],
          // 设置翻译和语言选项
          translations: bpmnTranslations,
          locale: currentLocale.value, // 设置初始语言
          // 添加Camunda模型扩展
          moddleExtensions: {
            camunda: camundaModdleDescriptor
          }
        });

        // 覆盖 getPad 方法防止警告
        setTimeout(() => {
          try {
            const contextPad = bpmnModeler?.get('contextPad');
            if (contextPad) {
              const originalGetPad = contextPad.getPad;
              contextPad.getPad = function (element: any) {
                // 暂时禁用console.warn
                const originalWarn = console.warn;
                console.warn = function () { };

                try {
                  // 调用原始方法
                  const result = originalGetPad.call(this, element);
                  // 恢复console.warn
                  console.warn = originalWarn;
                  return result;
                } catch {
                  // 恢复console.warn
                  console.warn = originalWarn;
                  // 失败时返回一个最小化替代品
                  return { html: document.createElement('div') };
                }
              };
            }
          } catch {
            // 忽略错误
          }
        }, 200);

        // 导入初始图表
        importBpmnDiagram(INITIAL_XML);

        // 注册BPMN事件监听器
        registerBpmnEventListeners();

        // 应用当前主题样式
        applyThemeStyles();
      } catch (error) {
        console.error('初始化BPMN建模器失败:', error);
        message.error('初始化流程设计器失败');
      }
    };

    // 监听主题变化
    watch(
      () => isDark.value,
      (newIsDark) => {
        // 直接使用当前值应用主题样式
        if (containerRef.value) {
          const container = containerRef.value;
          if (newIsDark) {
            container.classList.add('bpmn-dark-theme');
          } else {
            container.classList.remove('bpmn-dark-theme');
          }
        }
        
        // 主题变化后直接应用栅格样式
        applyGridStyles();
        
        // 如果BPMN模块已初始化，则触发主题变更事件
        if (bpmnModeler) {
          try {
            const eventBus = bpmnModeler.get('eventBus');
            if (eventBus) {
              eventBus.fire('theme.changed', { 
                isDark: newIsDark 
              });
            }
          } catch (error) {
            console.error('触发BPMN主题变更事件失败:', error);
          }
        }
      },
      { immediate: true },
    );

    // 组件卸载时销毁
    onUnmounted(() => {
      try {
        // 销毁BPMN建模器
        if (bpmnModeler) {
          bpmnModeler.destroy();
          bpmnModeler = null;
        }
      } catch (error) {
        console.error('[BPMN] 销毁BPMN建模器出错:', error);
      }
    });

    // 导入BPMN图表
    const importBpmnDiagram = async (xml: string) => {
      try {
        if (!bpmnModeler) return;

        console.warn('[BPMN导入] 开始导入BPMN图表');

        await bpmnModeler.importXML(xml);
        try {
          // 确保SVG已完全初始化
          const canvas = bpmnModeler.get('canvas');
          if (canvas) {
            const svgContainer =
              canvas._container && canvas._container.querySelector('svg');
            if (
              svgContainer &&
              typeof svgContainer.createSVGMatrix === 'function'
            ) {
              canvas.zoom('fit-viewport');
            } else {
              console.warn('[BPMN导入] SVG元素尚未初始化完成，延迟缩放操作');
              // 延迟执行缩放
              setTimeout(() => {
                try {
                  canvas.zoom('fit-viewport');
                } catch (error) {
                  console.error('延迟缩放失败:', error);
                }
              }, 100);
            }
          }
        } catch (zoomError) {
          console.error('缩放操作出错:', zoomError);
        }

        message.success(t('workflow.messages.importSuccess'));

        // 导入完成后确保应用当前语言
        console.warn('[BPMN导入] 导入完成，设置语言为：', currentLocale.value);

        setTimeout(() => {
          try {
            // 尝试使用i18n模块切换语言
            try {
              const i18n = bpmnModeler?.get('i18n');
              if (i18n && typeof i18n.changeLanguage === 'function') {
                i18n.changeLanguage(currentLocale.value);
                console.warn(
                  '[BPMN导入] 通过i18n导入后语言已设置为:',
                  currentLocale.value,
                );
                return; // 成功设置后直接返回
              }
            } catch (error: any) {
              console.warn('尝试使用i18n模块时出错:', error.message);
            }

            // 如果i18n不可用，尝试translate模块
            try {
              const translate = bpmnModeler?.get('translate');
              if (translate && typeof translate.changeLanguage === 'function') {
                translate.changeLanguage(currentLocale.value);
                console.warn(
                  '[BPMN导入] 通过translate导入后语言已设置为:',
                  currentLocale.value,
                );
              } else {
                console.warn('[BPMN导入] 无法找到可用的语言切换方法');
              }
            } catch (error: any) {
              console.warn(
                '[BPMN导入] 尝试使用translate模块时出错:',
                error.message,
              );
            }
          } catch (error) {
            console.error('[BPMN导入] 导入后设置语言失败:', error);
          }
        }, 200);
      } catch (error) {
        console.error('[BPMN导入] 导入BPMN图表失败', error);
        message.error(t('workflow.messages.importFailed'));
      }
    };

    // 保存流程
    const saveProcess = async () => {
      try {
        if (!bpmnModeler) return;

        const { xml } = await bpmnModeler.saveXML({ format: true });
        console.warn('保存的XML', xml);
        // 这里可以添加将XML发送到后端的逻辑
        message.success(t('workflow.messages.saveSuccess'));
      } catch (error) {
        console.error('保存流程失败', error);
        message.error(t('workflow.messages.saveFailed'));
      }
    };

    // 下载XML
    const downloadXml = async () => {
      try {
        if (!bpmnModeler) return;

        const { xml } = await bpmnModeler.saveXML({ format: true });
        const blob = new Blob([xml], { type: 'application/xml' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `workflow_${Date.now()}.bpmn`;
        document.body.append(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error('下载XML失败', error);
        message.error(t('workflow.messages.downloadFailed'));
      }
    };

    // 导入XML
    const importXml = () => {
      uploadRef.value?.upload?.click();
    };

    // 上传前处理文件
    const handleBeforeUpload = async (file: File) => {
      try {
        const xml = await file.text();
        importBpmnDiagram(xml);
      } catch (error: any) {
        console.error('读取文件失败:', error);
        message.error(t('workflow.messages.importFailed'));
      }
      return false;
    };

    // 从URL加载BPMN图
    const loadDiagramFromUrl = async (url: string) => {
      try {
        if (!bpmnModeler) return;

        const response = await fetch(url);
        const diagram = await response.text();

        // 应用主题
        try {
          const darkMode = isDark?.value;
          if (darkMode) {
            document.body.classList.add('theme-dark');
          } else {
            document.body.classList.remove('theme-dark');
          }
        } catch (error) {
          console.error('应用主题时出错:', error);
        }

        // 导入XML并正确处理Promise
        try {
          const { warnings } = await bpmnModeler.importXML(diagram);
          if (warnings && warnings.length > 0) {
            console.warn('导入图表时有警告:', warnings);
          }
        } catch (error) {
          console.error('导入XML时出错:', error);
        }
      } catch (error) {
        console.error('加载图表失败', error);
      }
    };

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
      gridConfig,
      toggleGrid,
      adjustGridSize,
      t,
      loadDiagramFromUrl,
      currentLocale, // 暴露给模板
    };
  },
});
</script>

<template>
  <div class="bpmn-designer-container" ref="containerRef">
    <ACard :bordered="false" title="" :bodyStyle="{ padding: '12px 16px' }" class="toolbar-card">
      <ASpace wrap>
        <AButton type="primary" @click="saveProcess">
          <template #icon>
            <SaveOutlined />
          </template>
          {{ t('workflow.actions.save') }}
        </AButton>
        <AButton @click="downloadXml">
          <template #icon>
            <DownloadOutlined />
          </template>
          {{ t('workflow.actions.download') }}
        </AButton>
        <AUpload ref="uploadRef" :show-upload-list="false" accept=".bpmn, .xml" :before-upload="handleBeforeUpload"
          :multiple="false">
          <AButton>
            <template #icon>
            <UploadOutlined />
          </template>
          {{ t('workflow.actions.import') }}
          </AButton>
        </AUpload>
        <ADivider type="vertical" />
        <AButton :type="gridConfig.enabled ? 'primary' : 'default'" @click="toggleGrid">
          {{
            gridConfig.enabled
              ? t('workflow.actions.hideGrid')
              : t('workflow.actions.showGrid')
          }}
        </AButton>
        <ASelect v-if="gridConfig.enabled" v-model:value="gridConfig.size" style="width: 120px" :options="[
            { value: 10, label: '10px' },
            { value: 20, label: '20px' },
            { value: 30, label: '30px' },
            { value: 40, label: '40px' },
            { value: 50, label: '50px' },
        ]" />
      </ASpace>
    </ACard>

    <div class="bpmn-content-wrapper">
    <div class="bpmn-content">
      <div ref="canvasRef" class="bpmn-canvas"></div>
        <div class="bpmn-panel-container">
      <div ref="panelRef" class="bpmn-panel"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.bpmn-designer-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
  padding: 16px;
  
  .toolbar-card {
    margin-bottom: 0; // 移除工具栏下方的间距
    border-bottom: none; // 移除底部边框
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    z-index: 2; // 确保卡片在上层
    box-shadow: 0 2px 5px -2px rgba(0, 0, 0, 0.08); // 添加微妙的阴影效果
  }

  .bpmn-content-wrapper {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: calc(100vh - 180px);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    margin-top: -1px; // 微调位置，让边框重叠
  }

  .bpmn-content {
    display: flex;
    flex: 1;
    height: 100%;
    overflow: hidden;
    background-color: hsl(var(--background));
    position: relative;
    border: 1px solid hsl(var(--border));
    border-radius: 4px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;

    .bpmn-canvas {
      flex: 1;
      height: 100%;
      background-color: hsl(var(--card));
      position: relative;
      /* 确保子绝对定位元素相对于此元素定位 */
      border-right: 1px solid hsl(var(--border));

      // 移除选中和点击时的边框
      &:focus,
      &:focus-visible,
      &:focus-within {
        outline: none !important;
        box-shadow: none !important;
        border-color: hsl(var(--border)) !important;
      }

      /* 栅格层样式 */
      .bpmn-grid-layer {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 10;
      }
    }

    .bpmn-panel-container {
      width: 320px;
      height: 100%;
      overflow: hidden;
      position: relative;
      background-color: hsl(var(--card));
      border-left: 1px solid hsl(var(--border));
      display: flex;
      flex-direction: column;

      .bpmn-panel {
        width: 100%;
        height: 100%;
        overflow: auto;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
    }
  }
}

:deep(.bio-properties-panel-header-icon) {
    color: hsl(var(--primary)) !important;
    fill: hsl(var(--primary)) !important;
  }



// 修复属性面板可滚动区域
:deep(.bpp-properties-panel) {
  background-color: hsl(var(--card)) !important;
  border-color: hsl(var(--border)) !important;
  color: hsl(var(--foreground)) !important;
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
}

:deep(.bpp-properties-header) {
  background-color: hsl(var(--secondary)) !important;
  color: hsl(var(--secondary-foreground)) !important;
  border-color: hsl(var(--border)) !important;
  position: sticky;
  top: 0;
  z-index: 10;
}

:deep(.bpp-properties-tab-bar) {
  background-color: hsl(var(--accent)) !important;
  border-color: hsl(var(--border)) !important;
  position: sticky;
  top: 35px;
  z-index: 9;
}

:deep(.bpp-properties-tabs-links li.bpp-active a) {
  border-color: hsl(var(--primary)) !important;
  color: hsl(var(--primary)) !important;
}

:deep(.bpp-properties-group) {
  border-color: hsl(var(--border)) !important;
}

:deep(.bpp-properties-entry input,
  .bpp-properties-entry select,
  .bpp-properties-entry textarea) {
  background-color: hsl(var(--input-background)) !important;
  border-color: hsl(var(--input)) !important;
  color: hsl(var(--foreground)) !important;
}

// 调色板样式优化
:deep(.djs-palette) {
  background-color: hsl(var(--card)) !important;
  border-color: hsl(var(--border)) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  border-radius: 6px !important;
  overflow: hidden !important;
  top: 10px !important;
  left: 10px !important;
}

:deep(.djs-palette-entries) {
  border-color: hsl(var(--border)) !important;
  background-color: rgba(238, 238, 238, 0.5) !important;
}

:deep(.djs-palette-entries .entry) {
  border-bottom: 1px solid hsla(var(--border) / 0.3) !important;

  &:hover {
    background-color: hsl(var(--accent-hover)) !important;
  }
}

.bio-properties-panel-arrow-right,
.bio-properties-panel-add-entry,
.bio-properties-panel-collapsible-entry-arrow {
  fill: hsl(var(--primary)) !important;
}

:deep(.bio-properties-panel-arrow-right),
  :deep(.bio-properties-panel-collapsible-entry-arrow) {
    fill: hsl(var(--primary)) !important;
  }

  :deep(.bio-properties-panel-add-entry) {
    fill: hsl(var(--primary)) !important;
    
    &:hover {
      fill: hsl(var(--foreground)) !important;
      background-color: hsla(var(--primary) / 0.2) !important;
      border-radius: 50%;
    }
    
    /* 确保SVG内部元素也应用正确的颜色 */
    svg, path, circle, rect, polygon {
      fill: hsl(var(--primary)) !important;
      stroke: none !important;
      
      &:hover {
        fill: hsl(var(--foreground)) !important;
      }
    }
  }

// 右键菜单样式优化
:deep(.djs-context-pad) {
  background-color: transparent !important;
  box-shadow: none !important;

  .entry {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;

    &:hover {
      background-color: transparent !important;
    }

    // 修复图标
    i {
      &:before {
        color: hsl(var(--foreground)) !important;
      }
    }

    svg,
    path,
    circle,
    rect,
    polygon {
      fill: hsl(var(--foreground)) !important;
      stroke: none !important; // 去掉边框
    }

    // 针对特定图标类型的覆盖
    &[class*='bpmn-icon'] {

      &:before,
      &:after {
        border: none !important;
        box-shadow: none !important;
        stroke: none !important;
      }
    }

    // 连接器图标特殊处理
    &[data-action='connect'] {

      svg,
      path,
      circle,
      rect,
      polygon {
        stroke-width: 0 !important;
      }
    }

    // 删除图标特殊处理
    &[data-action='delete'] {

      svg,
      path {
        fill: hsl(var(--destructive)) !important;
        stroke: none !important;
      }

      &:hover {
        background-color: transparent !important;
      }
    }
  }
}

:deep(.bio-properties-panel-dot) {
    background-color: hsl(var(--primary)) !important;
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

// 移除所有元素的焦点边框
:deep(.djs-container *) {

  &:focus,
  &:focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }
}

// 移除画布的焦点边框
:deep(.djs-container svg) {

  &:focus,
  &:focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }
}

:deep(.djs-popup-search-icon) {
  background-color: hsla(var(--primary) / 0) !important;
  left: 16px !important;
  top: 16px !important;
  font-size: 14px !important;
  
  &:before {
    content: "🔍" !important;
    opacity: 0.7 !important;
  }
}

.bpmn-dark-theme {
  :deep(.bpmn-canvas) {
    background-color: hsl(var(--background-deep)) !important;
  }

  // 移除暗黑主题下的画布焦点边框
  :deep(.djs-container),
  :deep(.djs-container svg),
  :deep(.djs-element) {

    &:focus,
    &:focus-visible,
    &:focus-within {
      outline: none !important;
      box-shadow: none !important;
    }
  }

  // 防止选中时出现浏览器默认的蓝色边框
  ::selection {
    background-color: hsla(var(--primary) / 0.2) !important;
  }

  // 全局图标修复
  :deep(.djs-container svg) {
    background-color: hsl(var(--background-deep)) !important;

    // 修复所有SVG图标元素
    path,
    polyline,
    rect,
    circle,
    polygon {
      stroke: hsl(var(--foreground)) !important;
    }

    // 强制所有图标元素具有较高的对比度
    .djs-visual {

      path,
      polyline,
      rect,
      circle,
      polygon {
        stroke-width: 1.5px !important;
      }
    }
  }

  // 工具栏图标修复
  :deep(.bpmn-icon-task),
  :deep(.bpmn-icon-start-event),
  :deep(.bpmn-icon-end-event),
  :deep(.bpmn-icon-intermediate-event),
  :deep(.bpmn-icon-gateway-none),
  :deep(.bpmn-icon-gateway-parallel),
  :deep(.bpmn-icon-gateway-xor),
  :deep(.bpmn-icon-gateway-or),
  :deep(.bpmn-icon-gateway-complex),
  :deep(.bpmn-icon-gateway-eventbased),
  :deep(.bpmn-icon-subprocess-expanded),
  :deep(.bpmn-icon-data-object),
  :deep(.bpmn-icon-data-store),
  :deep(.bpmn-icon-participant),
  :deep(.bpmn-icon-group),
  :deep(.bpmn-icon-connection),
  :deep(.bpmn-icon-connection-multi),
  :deep(.bpmn-icon-lasso-tool),
  :deep(.bpmn-icon-space-tool),
  :deep(.bpmn-icon-hand-tool),
  :deep(.bpmn-icon-global-connect-tool),
  :deep(.bpmn-icon-text-annotation) {
    color: hsl(var(--foreground)) !important;

    path,
    polyline,
    rect,
    circle,
    polygon,
    line {
      fill: hsl(var(--foreground)) !important;
      stroke: hsl(var(--foreground)) !important;
    }
  }

  // 修复元素基本样式
  :deep(.djs-element .djs-visual) {

    // 基本形状
    rect,
    circle,
    path,
    polygon {
      stroke: hsl(var(--foreground)) !important;
      stroke-width: 2px !important;
      fill: hsla(var(--card) / 0.8) !important;
    }

    // 线条元素
    polyline,
    line {
      stroke: hsl(var(--foreground)) !important;
      stroke-width: 2px !important;
    }

    // 文本标签
    text,
    tspan {
      fill: hsl(var(--foreground)) !important;
      stroke: none !important;
    }
  }

  // 特殊元素修复
  // 任务
  :deep(.djs-container .djs-shape[data-element-id*='Task'] .djs-visual rect) {
    fill: hsla(var(--primary) / 0.1) !important;
    stroke: hsl(var(--primary)) !important;
    stroke-width: 2px !important;
  }

  // 子流程
  :deep(.djs-container .djs-shape[data-element-id*='SubProcess'] .djs-visual rect) {
    fill: hsla(var(--accent) / 0.1) !important;
    stroke: hsl(var(--accent)) !important;
    stroke-width: 2px !important;
  }

  // 开始事件
  :deep(.djs-container .djs-shape[data-element-id*='StartEvent'] .djs-visual circle) {
    fill: hsla(var(--primary) / 0.1) !important;
    stroke: hsl(var(--primary)) !important;
    stroke-width: 2px !important;
  }

  // 结束事件
  :deep(.djs-container .djs-shape[data-element-id*='EndEvent'] .djs-visual circle) {
    fill: hsla(var(--destructive) / 0.1) !important;
    stroke: hsl(var(--destructive)) !important;
    stroke-width: 3px !important;
  }

  // 中间事件
  :deep(.djs-container .djs-shape[data-element-id*='IntermediateEvent'] .djs-visual circle) {
    fill: hsla(var(--warning) / 0.1) !important;
    stroke: hsl(var(--warning)) !important;
    stroke-width: 2px !important;
  }

  // 网关
  :deep(.djs-container .djs-shape[data-element-id*='Gateway'] .djs-visual polygon) {
    fill: hsla(var(--warning) / 0.2) !important;
    stroke: hsl(var(--warning)) !important;
    stroke-width: 2px !important;
  }

  // 连接线
  :deep(.djs-container .djs-connection .djs-visual path) {
    stroke: hsl(var(--foreground)) !important;
    stroke-width: 1.5px !important;
  }

  // 文本注释
  :deep(.djs-container .djs-shape[data-element-id*='TextAnnotation'] .djs-visual) {
    path {
      fill: transparent !important;
      stroke: hsl(var(--muted-foreground)) !important;
    }

    text {
      fill: hsl(var(--muted-foreground)) !important;
    }
  }

  // 数据对象
  :deep(.djs-container .djs-shape[data-element-id*='DataObject'] .djs-visual path),
  :deep(.djs-container .djs-shape[data-element-id*='DataStore'] .djs-visual path) {
    fill: hsla(var(--secondary) / 0.2) !important;
    stroke: hsl(var(--secondary)) !important;
  }

  // 确保所有标签文本可见
  :deep(.djs-container .djs-label) {
    fill: hsl(var(--foreground)) !important;
    stroke: none !important;
    // 添加文本阴影以提高可读性
    text-shadow: 0px 0px 2px hsla(var(--background) / 0.8) !important;
  }

  // 修复调色板样式
  :deep(.djs-palette) {
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6) !important;
    background-color: hsl(var(--background)) !important;
    border-color: hsl(var(--border)) !important;
  }

  :deep(.djs-palette-entries) {
    border-color: hsl(var(--border)) !important;
    background-color: rgba(58, 58, 58, 0.5) !important;
  }

  :deep(.djs-palette-entries .entry) {
    color: hsl(var(--foreground)) !important;
    border-bottom: 1px solid hsla(var(--border) / 0.5) !important;

    &:hover {
      background-color: hsl(var(--accent-hover)) !important;
    }

    // 确保图标在暗色模式下可见
    i:before {
      color: hsl(var(--foreground)) !important;
    }
  }

  // 修复弹出窗口
  :deep(.djs-popup) {
    background-color: hsl(var(--background)) !important;
    border: 1px solid hsl(var(--border)) !important;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5) !important;

    .djs-popup-header {
      background-color: hsl(var(--accent-dark)) !important;
      color: hsl(var(--accent-foreground)) !important;
    }

    .entry {
      color: hsl(var(--foreground)) !important;

      &:hover {
        background-color: hsl(var(--accent-hover)) !important;
      }
    }

    // 修复搜索框
    .djs-popup-search {
      background-color: hsl(var(--background)) !important;
      padding: 8px !important;
      border-bottom: 1px solid hsl(var(--border)) !important;
      
      input {
        background-color: hsl(var(--input)) !important;
        color: hsl(var(--foreground)) !important;
        border: 1px solid hsl(var(--border)) !important;
        border-radius: 4px !important;
        padding: 6px 12px 6px 30px !important;
        width: 100% !important;

        &:focus {
          background-color: hsla(var(--primary) / 0.1) !important;
          border-color: hsl(var(--primary)) !important;
          outline: none !important;
          box-shadow: 0 0 0 2px hsla(var(--primary) / 0.2) !important;
        }
      }
    }

    // 修复搜索图标
    .djs-popup-search-icon {
      background-color: hsla(var(--primary) / 0) !important;
      color: hsl(var(--muted-foreground)) !important;
      left: 18px !important;
      top: 18px !important;
      font-size: 14px !important;
      
      &:before {
        content: "🔍" !important;
        opacity: 0.7 !important;
      }
    }

    // 修复选中项
    .entry.selected {
      background-color: hsla(var(--primary) / 0.2) !important;
      color: hsl(var(--primary-foreground)) !important;

      // 确保选中项中的图标也有正确颜色
      i:before,
      svg,
      path,
      polygon,
      rect,
      circle {
        color: hsl(var(--primary-foreground)) !important;
        fill: hsl(var(--primary-foreground)) !important;
        stroke: hsl(var(--primary-foreground)) !important;
      }

      // 确保标签文本可见
      .djs-popup-label {
        color: hsl(var(--primary-foreground)) !important;
      }

      // 确保描述文本可见
      .djs-popup-entry-description {
        color: hsla(var(--primary-foreground) / 0.8) !important;
      }
    }

    // 修复类型选择器项
    .bpmn-replace-entry {
      background-color: transparent !important;

      &:hover {
        background-color: hsl(var(--accent-hover)) !important;
      }

      &.selected {
        background-color: hsla(var(--primary) / 0.2) !important;

        // 确保选中项的图标和文字清晰可见
        .entry-icon {
          filter: brightness(1.2) !important;
        }

        .entry-label {
          color: hsl(var(--primary-foreground)) !important;
          font-weight: 600 !important;
        }
      }
    }
  }

  // 修复选择样式
  :deep(.djs-container .selected .djs-outline) {
    stroke: hsl(var(--primary)) !important;
    stroke-width: 2px !important;
  }

  // 修复控制点
  :deep(.djs-bendpoint),
  :deep(.djs-segment-dragger) {
    fill: hsl(var(--primary)) !important;
    stroke: hsl(var(--background)) !important;
    stroke-width: 1px !important;
  }

  // 修复文本编辑
  :deep(.djs-direct-editing-content) {
    background-color: hsl(var(--background)) !important;
    border: 1px solid hsl(var(--border)) !important;
    color: hsl(var(--foreground)) !important;
  }

  // 修复缩略图样式
  :deep(.djs-minimap) {
    background-color: hsla(var(--card) / 0.9) !important;
    border: 1px solid hsl(var(--border)) !important;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;

    // 修复缩略图标题和图标
    .djs-minimap-header {
      background-color: hsl(var(--accent-dark)) !important;
      border-bottom: 1px solid hsl(var(--border)) !important;
      color: hsl(var(--accent-foreground)) !important;

      // 修复关闭按钮
      .djs-minimap-close {
        background-color: transparent !important;
        border: none !important;
        color: hsl(var(--accent-foreground)) !important;

        &:hover {
          color: hsl(var(--destructive)) !important;
        }

        // 修复X图标
        &:before {
          color: hsl(var(--accent-foreground)) !important;
          content: '×' !important;
          font-size: 16px !important;
          font-weight: bold !important;
        }
      }

      // 修复标题文本
      .djs-minimap-title {
        color: hsl(var(--accent-foreground)) !important;
        font-weight: bold !important;
      }
    }

    // 修复缩略图内容
    .djs-minimap-viewport {
      border: 2px solid hsl(var(--primary)) !important;
    }

    // 修复打开/关闭的图标
    .djs-minimap-toggle {
      background-color: hsla(var(--card) / 0.9) !important;
      border: 1px solid hsl(var(--border)) !important;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3) !important;
      color: hsl(var(--foreground)) !important;

      &:hover {
        background-color: hsl(var(--accent-hover)) !important;
      }

      // 修复图标
      &:before {
        color: hsl(var(--foreground)) !important;
      }
    }
  }

  // 新增工具栏样式
  :deep(.djs-context-pad) {
    background-color: transparent !important;
    box-shadow: none !important;

    .entry {
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;

      &:hover {
        background-color: transparent !important;
      }

      // 确保图标在暗色模式下可见
      i:before {
    color: hsl(var(--foreground)) !important;
  }

      svg,
      path,
      circle,
      rect,
      polygon {
        fill: hsl(var(--foreground)) !important;
        stroke: none !important;
      }
    }
  }

  :deep(.bio-properties-panel-header) {
    background-color: #141414 !important;
    color: #ffffff !important;
    border-bottom: 1px solid hsla(var(--border) / 0.7) !important;
  }
  
  :deep(.bio-properties-panel-group-header) {
    background-color: hsla(var(--card) / 0.9) !important;
    color: #ffffff !important;
    border-bottom: 1px solid hsla(var(--border) / 0.5) !important;
    
    .bio-properties-panel-dot {
      background-color: hsl(var(--primary)) !important;
    }
    
    .bio-properties-panel-arrow-right,
    .bio-properties-panel-add-entry,
    .bio-properties-panel-collapsible-entry-arrow {
      fill: hsl(var(--primary)) !important;
    }

    &:hover {
      background-color: hsla(var(--card) / 0.7) !important;
    }
  }
  
  :deep(.bio-properties-panel-group) {
    background-color: hsla(var(--card) / 0.9) !important;
    color: #ffffff !important;
    border-bottom: 1px solid hsla(var(--border) / 0.3) !important;
    
    /* Form elements styling */
    input, textarea, select {
      background-color: hsla(var(--muted) / 0.7) !important;
      color: #ffffff !important;
      border: 1px solid hsla(var(--border) / 0.8) !important;
      border-radius: 4px;
      
      &:focus {
        border-color: hsl(var(--primary)) !important;
        outline: none;
        box-shadow: 0 0 0 2px hsla(var(--primary) / 0.3) !important;
      }
      
      &:hover:not(:focus) {
        border-color: hsla(var(--border)) !important;
      }
    }
    
    /* Labels and descriptions */
    label {
    color: hsl(var(--foreground)) !important;
      font-weight: 500;
    }
    
    .bio-properties-panel-description {
      color: hsla(var(--muted-foreground) / 0.9) !important;
      font-size: 0.9em;
      margin-top: 2px;
    }
    
    /* Nested entries indentation and borders */
    .bio-properties-panel-entry {

      border-bottom: 1px solid hsla(var(--border) / 0.2) !important;
      
      &:last-child {
        border-bottom: none;
      }
    }
    
    /* Collapsible entries */
    .bio-properties-panel-collapsible-entry {
      background-color: hsla(var(--muted) / 0.3) !important;
      border-radius: 4px;
      margin: 4px 0;
      
      .bio-properties-panel-collapsible-entry-header {
        padding: 6px 8px;
        border-bottom: 1px solid hsla(var(--border) / 0.3) !important;

    &:hover {
          background-color: hsla(var(--muted) / 0.5) !important;
        }
      }
      
      .bio-properties-panel-collapsible-entry-content {
        padding: 4px 8px 4px 16px;
      }
    }
  }
  
  :deep(.bio-properties-panel-header-icon) {
    color: hsl(var(--primary)) !important;
    fill: hsl(var(--primary)) !important;

    /* 确保SVG内部元素也应用正确的颜色 */
    svg, path, circle, rect, polygon {
      color: hsl(var(--primary)) !important;
      fill: hsl(var(--primary)) !important;
      stroke: none !important;
    }
  }
  
  :deep(.bio-properties-panel-add-entry) {
    fill: hsl(var(--primary)) !important;
    
    &:hover {
      fill: hsl(var(--foreground)) !important;
      background-color: hsla(var(--primary) / 0.2) !important;
      border-radius: 50%;
    }
    
    /* 确保SVG内部元素也应用正确的颜色 */
    svg, path, circle, rect, polygon {
      fill: hsl(var(--primary)) !important;
      stroke: none !important;
      
      &:hover {
        fill: hsl(var(--foreground)) !important;
      }
    }
  }
  
  /* Add visual indication for active/selected items */
  :deep(.bio-properties-panel-active) {
    background-color: hsla(var(--primary) / 0.15) !important;
    border-left: 3px solid hsl(var(--primary)) !important;
  }
  
  /* 属性面板SVG图标颜色修复 - 确保响应主题变化 */
  :deep(.bio-properties-panel-header-icon) {
    color: hsl(var(--primary)) !important;
    fill: hsl(var(--primary)) !important;
    
    /* 确保SVG内部元素也应用正确的颜色 */
    svg, path, circle, rect, polygon {
      color: hsl(var(--primary)) !important;
      fill: hsl(var(--primary)) !important;
      stroke: none !important;
    }
  }
  
  :deep(.bio-properties-panel-add-entry) {
    fill: hsl(var(--primary)) !important;
    
    &:hover {
      fill: hsl(var(--primary-foreground)) !important;
      background-color: hsla(var(--primary) / 0.2) !important;
      border-radius: 50%;
    }
    
    /* 确保SVG内部元素也应用正确的颜色 */
    svg, path, circle, rect, polygon {
      fill: hsl(var(--primary)) !important;
      stroke: none !important;
    }
  }
  
  :deep(.bio-properties-panel-group-header-icon) {
    color: hsl(var(--primary)) !important;
    fill: hsl(var(--primary)) !important;
    
    svg, path, circle, rect, polygon {
      color: hsl(var(--primary)) !important;
      fill: hsl(var(--primary)) !important;
    }
  }
  
  :deep(.bio-properties-panel-arrow-right),
  :deep(.bio-properties-panel-collapsible-entry-arrow) {
    fill: hsl(var(--primary)) !important;
  }
  
  :deep(.bio-properties-panel-dot) {
    background-color: hsl(var(--primary)) !important;
  }
  
  /* Improve scrollbar visibility */
  :deep(.bio-properties-panel) {
    scrollbar-width: thin;
    scrollbar-color: hsla(var(--muted-foreground) / 0.5) transparent;
    
    &::-webkit-scrollbar {
      width: 8px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: hsla(var(--muted-foreground) / 0.5);
      border-radius: 4px;
      
      &:hover {
        background-color: hsla(var(--muted-foreground) / 0.8);
      }
    }
  }
}


</style>
