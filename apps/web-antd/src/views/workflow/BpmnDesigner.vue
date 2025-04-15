<script lang="ts">
import {
  defineComponent,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue';

import { useI18n } from '@vben/locales';
// 导入主题相关
import { usePreferences } from '@vben/preferences';

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

    // 修复可能的格式化问题
    const t = (key, ...args) => {
      try {
        // 确保正确的键名路径
        // 如果key已经包含workflow前缀，则直接使用
        const fullKey = key.startsWith('workflow.') ? key : `workflow.${key}`;
        const result = originalT(fullKey, ...args);

        // 如果返回结果是对象或undefined，尝试使用原始键
        if (typeof result !== 'string' || result === fullKey) {
          console.debug(`翻译失败，尝试使用原始键: ${key}`);
          return originalT(key, ...args) || key;
        }

        // 确保返回的是字符串，而不是HTML或React组件等
        return result;
      } catch (error) {
        console.error(`翻译错误 [${key}]:`, error);
        // 出错时返回原始键
        return key.split('.').pop() || key;
      }
    };

    // 当前语言
    const currentLocale = ref('');

    // 获取当前语言
    try {
      // 尝试从i18n实例获取当前语言
      if (originalT && originalT.locale) {
        currentLocale.value = originalT.locale.value || '';
      }
    } catch (error) {
      console.error('获取当前语言失败:', error);
    }

    // 在组件中维护工具栏语言状态
    const toolbarLang = ref(
      // 尝试检测系统语言，默认为中文
      (() => {
        try {
          console.log('开始检测系统语言...');

          // 首先尝试从localStorage获取用户之前的偏好设置
          const savedLang = localStorage.getItem('bpmn-toolbar-lang');
          if (savedLang) {
            console.log(
              '从localStorage读取到已保存的工具栏语言偏好:',
              savedLang,
            );
            if (savedLang === 'en' || savedLang === 'zh') {
              return savedLang;
            }
          }

          // 优先从i18n实例获取
          if (originalT && originalT.locale && originalT.locale.value) {
            const i18nLang = originalT.locale.value;
            console.log('从i18n检测到初始语言:', i18nLang);

            // 更精确的英文检测
            const isEnLang =
              i18nLang === 'en' ||
              i18nLang === 'en-US' ||
              i18nLang === 'en_US' ||
              i18nLang.toLowerCase().startsWith('en');

            if (isEnLang) {
              console.log('确认系统当前为英文环境');
              return 'en';
            }

            console.log('未检测到英文环境，假定为中文');
          } else {
            console.log('无法从i18n获取语言信息');
          }

          // 尝试从DOM获取语言信息
          if (document.documentElement.lang) {
            console.log('从HTML标签检测语言:', document.documentElement.lang);
            if (document.documentElement.lang.toLowerCase().startsWith('en')) {
              return 'en';
            }
          }

          // 尝试从浏览器获取语言信息
          if (navigator.language) {
            console.log('从浏览器检测语言:', navigator.language);
            if (navigator.language.toLowerCase().startsWith('en')) {
              return 'en';
            }
          }

          // 默认中文
          return 'zh';
        } catch (error) {
          console.error('语言检测出错:', error);
          return 'zh';
        }
      })(),
    );

    console.log('工具栏语言初始化为:', toolbarLang.value);

    // 存储轮询状态的对象
    const pollState = {
      isPolling: false, // 是否正在轮询
      retryCount: 0, // 尝试次数
      maxRetries: 15, // 最大尝试次数
      retryInterval: 200, // 轮询间隔(ms)
      timeoutId: null, // setTimeout ID
    };

    // 应用工具栏翻译函数
    const applyToolbarTranslation = () => {
      try {
        // 使用工具栏语言状态
        const isEnglish = toolbarLang.value === 'en';

        // 工具栏翻译映射
        const toolbarTranslations = {
          // 工具类
          'bpmn-icon-hand-tool': isEnglish ? 'Hand Tool' : '手形工具',
          'bpmn-icon-lasso-tool': isEnglish ? 'Lasso Tool' : '套索工具',
          'bpmn-icon-space-tool': isEnglish ? 'Space Tool' : '空间工具',
          'bpmn-icon-connection-multi': isEnglish
            ? 'Global Connect Tool'
            : '连接工具',

          // 元素类
          'bpmn-icon-start-event-none': isEnglish
            ? 'Create Start Event'
            : '创建开始事件',
          'bpmn-icon-intermediate-event-none': isEnglish
            ? 'Create Intermediate Event'
            : '创建中间事件',
          'bpmn-icon-end-event-none': isEnglish
            ? 'Create End Event'
            : '创建结束事件',
          'bpmn-icon-gateway-none': isEnglish ? 'Create Gateway' : '创建网关',
          'bpmn-icon-task': isEnglish ? 'Create Task' : '创建任务',
          'bpmn-icon-subprocess-expanded': isEnglish
            ? 'Create Sub Process'
            : '创建子流程',
          'bpmn-icon-data-object': isEnglish
            ? 'Create Data Object'
            : '创建数据对象',
          'bpmn-icon-data-store': isEnglish
            ? 'Create Data Store'
            : '创建数据存储',
          'bpmn-icon-participant': isEnglish
            ? 'Create Pool/Participant'
            : '创建参与者',
          'bpmn-icon-group': isEnglish ? 'Create Group' : '创建分组',
          'bpmn-icon-text-annotation': isEnglish
            ? 'Create Text Annotation'
            : '创建文本注释',
        };

        // 查找并更新工具栏提示
        const paletteEntries = document.querySelectorAll('.djs-palette .entry');
        if (paletteEntries.length > 0) {
          paletteEntries.forEach((el) => {
            const iconClass = [...el.classList].find((cls) =>
              cls.startsWith('bpmn-icon-'),
            );
            if (iconClass && toolbarTranslations[iconClass]) {
              el.setAttribute('title', toolbarTranslations[iconClass]);
            }
          });

          console.log('工具栏提示已翻译为:', isEnglish ? '英文' : '中文');
          return true; // 翻译成功
        } else {
          console.log('未找到工具栏元素，可能还未渲染');
          return false; // 未找到工具栏元素
        }
      } catch (error) {
        console.error('应用工具栏翻译出错:', error);
        return false; // 出错
      }
    };

    // 开始轮询检测工具栏并应用翻译
    const startPolling = () => {
      // 如果已经在轮询中，则不重新启动
      if (pollState.isPolling) {
        console.log('轮询已在进行中，不重复启动');
        return;
      }

      // 重置轮询状态
      pollState.isPolling = true;
      pollState.retryCount = 0;

      // 清除可能存在的上一次轮询
      if (pollState.timeoutId) {
        clearTimeout(pollState.timeoutId);
      }

      console.log('开始轮询检测工具栏...');

      // 轮询函数
      const poll = () => {
        pollState.retryCount++;

        // 尝试应用翻译
        const success = applyToolbarTranslation();

        if (success) {
          // 翻译成功，停止轮询
          console.log(
            `轮询成功: 第${pollState.retryCount}次尝试找到工具栏元素并完成翻译`,
          );
          pollState.isPolling = false;
        } else if (pollState.retryCount < pollState.maxRetries) {
          // 未成功且未达到最大尝试次数，继续轮询
          console.log(
            `轮询中: 第${pollState.retryCount}次尝试未找到工具栏元素，继续尝试...`,
          );
          pollState.timeoutId = setTimeout(poll, pollState.retryInterval);
        } else {
          // 达到最大尝试次数，停止轮询
          console.log('轮询结束: 达到最大尝试次数，仍未找到工具栏元素');
          pollState.isPolling = false;
        }
      };

      // 开始第一次轮询
      poll();
    };

    // 切换工具栏语言
    const toggleToolbarLang = () => {
      // 切换语言
      toolbarLang.value = toolbarLang.value === 'zh' ? 'en' : 'zh';
      console.log('手动切换工具栏语言为:', toolbarLang.value);

      // 保存到localStorage
      try {
        localStorage.setItem('bpmn-toolbar-lang', toolbarLang.value);
        console.log('已将用户语言偏好保存到localStorage');
      } catch (error) {
        console.error('保存语言设置失败:', error);
      }

      // 立即尝试应用一次
      const success = applyToolbarTranslation();

      // 如果失败，启动轮询
      if (success) {
        // 成功时显示消息通知
        message.success(
          toolbarLang.value === 'en'
            ? 'Toolbar switched to English'
            : '工具栏已切换为中文',
        );
      } else {
        startPolling();
      }
    };

    // 监听系统语言变化
    watch(
      () => {
        try {
          return originalT?.locale?.value || '';
        } catch (error) {
          console.error('监听语言变化出错:', error);
          return '';
        }
      },
      (newLocale) => {
        if (newLocale) {
          console.log('检测到系统语言变化:', newLocale);

          // 使用更精确的英文检测逻辑
          const isEnglish =
            newLocale === 'en' ||
            newLocale === 'en-US' ||
            newLocale === 'en_US' ||
            newLocale.toLowerCase().startsWith('en');

          console.log('系统语言是否为英文:', isEnglish);

          // 自动更新工具栏语言，与系统保持一致
          if (
            (isEnglish && toolbarLang.value !== 'en') ||
            (!isEnglish && toolbarLang.value !== 'zh')
          ) {
            // 更新语言状态
            toolbarLang.value = isEnglish ? 'en' : 'zh';
            console.log(`自动将工具栏语言更新为: ${toolbarLang.value}`);

            // 立即尝试应用一次
            const success = applyToolbarTranslation();

            // 如果失败，启动轮询
            if (!success) {
              startPolling();
            }
          }
        }
      },
      { immediate: true },
    );

    // 注册BPMN事件监听器
    function registerBpmnEventListeners() {
      if (!bpmnModeler) return;

      try {
        // 获取eventBus
        const eventBus = bpmnModeler.get('eventBus');

        if (eventBus) {
          // 监听画布就绪事件
          eventBus.on('canvas.init', () => {
            console.log('BPMN画布已初始化');
            window._bpmnInitialized = true;

            // 画布就绪后立即应用当前语言
            applyToolbarTranslation();
          });

          // 监听工具面板创建事件
          eventBus.on('palette.created', () => {
            console.log('BPMN工具面板已创建');

            // 工具面板创建后立即应用当前语言
            applyToolbarTranslation();
          });

          console.log('BPMN事件监听器注册成功');
        }
      } catch (error) {
        console.error('注册BPMN事件监听器出错:', error);
      }
    }

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

    // 栅格配置
    const gridConfig = reactive({
      enabled: true,
      size: 40,
    });

    // BPMN建模器实例
    let bpmnModeler: any = null;

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
      if (isDark.value) {
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

    // 实用的调试函数，检测当前系统语言状态
    const debugCurrentLanguage = () => {
      console.group('调试当前系统语言状态');
      try {
        // 检查i18n实例
        if (originalT && originalT.locale) {
          console.log('i18n当前语言:', originalT.locale.value);
        } else {
          console.log('i18n实例不可用或locale未定义');
        }

        // 检查DOM
        console.log(
          'HTML lang属性:',
          document.documentElement.lang || '未设置',
        );

        // 检查浏览器
        console.log('浏览器语言:', navigator.language);
        console.log('浏览器语言列表:', navigator.languages);

        // 检查localStorage
        console.log(
          'localStorage中的语言设置:',
          localStorage.getItem('bpmn-toolbar-lang') || '未设置',
        );
        console.log(
          'localStorage中的其他语言相关设置:',
          localStorage.getItem('lang') || '未设置',
          localStorage.getItem('locale') || '未设置',
        );

        // 其他可能影响语言的因素
        if (window.navigator.userLanguage) {
          console.log('userLanguage:', window.navigator.userLanguage);
        }

        // 当前工具栏状态
        console.log('当前工具栏语言状态:', toolbarLang.value);
      } catch (error) {
        console.error('调试语言状态时出错:', error);
      }
      console.groupEnd();
    };

    // 在挂载时调用一次调试函数
    onMounted(() => {
      // 初始化标志
      window._bpmnInitialized = false;

      // 调试当前语言状态
      setTimeout(debugCurrentLanguage, 500);

      // 初始化BPMN建模器
      initBpmnModeler();

      // 应用栅格样式
      applyGridStyles();

      // 初始尝试应用工具栏翻译
      if (!applyToolbarTranslation()) {
        startPolling();
      }
    });

    // 初始化BPMN建模器
    const initBpmnModeler = () => {
      if (bpmnModeler) return;

      // 创建一个拦截翻译的模块
      const TranslateModule = {
        translate: [
          'value',
          function (defaultTranslate) {
            // 自定义翻译函数
            return function (template, replacements) {
              // 确保template是字符串
              if (!template || typeof template !== 'string') {
                return defaultTranslate(template, replacements);
              }

              // 更全面的翻译映射
              const translationMap = {
                // 基本元素操作
                Append: t('workflow.actions.append'),
                Remove: t('workflow.actions.remove'),
                Connect: t('workflow.actions.connect'),
                Replace: t('workflow.actions.replace'),
                'Replace with': t('workflow.actions.replaceWith'),
                'Connect using': t('workflow.actions.connectUsing'),
                Settings: t('workflow.actions.settings'),
                General: t('workflow.properties.general'),
                Details: t('workflow.properties.details'),
                Documentation: t('workflow.properties.documentation'),
                Advanced: t('workflow.properties.advanced'),

                // 元素名称
                'Start Event': t('workflow.elements.startEventSingle'),
                'Intermediate Event': t(
                  'workflow.elements.intermediateEventSingle',
                ),
                'End Event': t('workflow.elements.endEventSingle'),
                Gateway: t('workflow.elements.gatewaySingle'),
                Task: t('workflow.elements.taskSingle'),
                'Data Object': t('workflow.elements.dataObjectSingle'),
                'Data Store': t('workflow.elements.dataStoreSingle'),
                'Pool/Participant': t('workflow.elements.participantSingle'),
                Group: t('workflow.elements.groupSingle'),
                'Text Annotation': t('workflow.elements.textAnnotationSingle'),
                'Subprocess (expanded)': t(
                  'workflow.elements.subProcessSingle',
                ),

                // 创建元素命令
                'Create StartEvent': t('workflow.elements.startEvent'),
                'Create IntermediateEvent': t(
                  'workflow.elements.intermediateEvent',
                ),
                'Create EndEvent': t('workflow.elements.endEvent'),
                'Create Gateway': t('workflow.elements.gateway'),
                'Create Task': t('workflow.elements.task'),
                'Create DataObjectReference': t('workflow.elements.dataObject'),
                'Create DataStoreReference': t('workflow.elements.dataStore'),
                'Create Pool/Participant': t('workflow.elements.participant'),
                'Create Group': t('workflow.elements.group'),
                'Create TextAnnotation': t('workflow.elements.textAnnotation'),
                'Create expanded SubProcess': t('workflow.elements.subProcess'),

                // 小写版本
                'create start event': t('workflow.elements.createStartEvent'),
                'create intermediate event': t(
                  'workflow.elements.createIntermediateEvent',
                ),
                'create end event': t('workflow.elements.createEndEvent'),
                'create gateway': t('workflow.elements.createGateway'),
                'create task': t('workflow.elements.createTask'),
                'create data object': t('workflow.elements.dataObject'),
                'create data store': t('workflow.elements.dataStore'),
                'create pool/participant': t('workflow.elements.participant'),
                'create group': t('workflow.elements.group'),
                'create text annotation': t('workflow.elements.textAnnotation'),
                'create subprocess (expanded)': t(
                  'workflow.elements.subProcess',
                ),

                // 不同的形式
                'Create a task': t('workflow.elements.createTask'),
                'Create a start event': t('workflow.elements.createStartEvent'),
                'Create an intermediate event': t(
                  'workflow.elements.createIntermediateEvent',
                ),
                'Create an end event': t('workflow.elements.createEndEvent'),
                'Create a gateway': t('workflow.elements.createGateway'),
                'Create a data object': t('workflow.elements.dataObject'),
                'Create a data store': t('workflow.elements.dataStore'),
                'Create a pool/participant': t('workflow.elements.participant'),
                'Create a group': t('workflow.elements.group'),
                'Create a text annotation': t(
                  'workflow.elements.textAnnotation',
                ),
                'Create a subprocess (expanded)': t(
                  'workflow.elements.subProcess',
                ),

                // 工具提示
                'Hand Tool': t('workflow.tools.handTool'),
                'Lasso Tool': t('workflow.tools.lassoTool'),
                'Space Tool': t('workflow.tools.spaceTool'),
                'Global Connect Tool': t('workflow.tools.connectTool'),

                // 工具激活提示
                'Activate the hand tool': t('workflow.tools.activateHandTool'),
                'Activate the lasso tool': t(
                  'workflow.tools.activateLassoTool',
                ),
                'Activate the create/remove space tool': t(
                  'workflow.tools.activateSpaceTool',
                ),
                'Activate the global connect tool': t(
                  'workflow.tools.activateConnectTool',
                ),

                // 不带"the"的版本
                'Activate hand tool': t('workflow.tools.activateHandTool'),
                'Activate lasso tool': t('workflow.tools.activateLassoTool'),
                'Activate create/remove space tool': t(
                  'workflow.tools.activateSpaceTool',
                ),
                'Activate global connect tool': t(
                  'workflow.tools.activateConnectTool',
                ),

                // 特殊处理Start Event
                'Create Start Event': t('workflow.elements.createStartEvent'),

                // 常用上下文菜单动作
                'Append Task': t('workflow.actions.appendTask'),
                'Append Gateway': t('workflow.actions.appendGateway'),
                'Append Event': t('workflow.actions.appendEvent'),
                Delete: t('workflow.actions.delete'),
                Edit: t('workflow.actions.edit'),
                'Add Lane': t('workflow.actions.addLane'),
                'Add Lane above': t('workflow.actions.addLaneAbove'),
                'Add Lane below': t('workflow.actions.addLaneBelow'),
                'Split Lane': t('workflow.actions.splitLane'),
                Append: t('workflow.actions.append'),
              };

              // 直接匹配
              if (translationMap[template]) {
                return translationMap[template];
              }

              // 尝试小写匹配
              const lowerTemplate = template.toLowerCase();
              for (const [key, value] of Object.entries(translationMap)) {
                if (key.toLowerCase() === lowerTemplate) {
                  return value;
                }
              }

              // 尝试部分匹配
              for (const [key, value] of Object.entries(translationMap)) {
                if (template.includes(key)) {
                  return template.replace(key, value);
                }
              }

              // 如果没有特定翻译，调用默认翻译函数
              return defaultTranslate(template, replacements);
            };
          },
        ],
      };

      try {
        bpmnModeler = new BpmnModeler({
          container: canvasRef.value,
          propertiesPanel: {
            parent: panelRef.value,
          },
          additionalModules: [
            BpmnPropertiesPanelModule,
            BpmnPropertiesProviderModule,
            TranslateModule, // 添加我们的翻译模块
          ],
        });

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
      () => {
        // 直接使用当前值应用主题样式
        if (containerRef.value) {
          const container = containerRef.value;
          if (isDark.value) {
            container.classList.add('bpmn-dark-theme');
          } else {
            container.classList.remove('bpmn-dark-theme');
          }
        }

        // 主题变化后直接应用栅格样式
        applyGridStyles();
      },
      { immediate: true },
    );

    // 组件卸载时销毁
    onUnmounted(() => {
      // 清理标志
      window._bpmnInitialized = false;

      // 清理轮询
      if (pollState.timeoutId) {
        clearTimeout(pollState.timeoutId);
        pollState.timeoutId = null;
      }

      // 销毁BPMN建模器
      if (bpmnModeler) {
        try {
          bpmnModeler.destroy();
        } catch (error) {
          console.error('销毁BPMN建模器出错:', error);
        }
        bpmnModeler = null;
      }
    });

    // 导入BPMN图表
    const importBpmnDiagram = async (xml: string) => {
      try {
        if (!bpmnModeler) return;

        await bpmnModeler.importXML(xml);
        bpmnModeler.get('canvas').zoom('fit-viewport');
        message.success(t('workflow.messages.importSuccess'));
      } catch (error) {
        console.error('导入BPMN图表失败', error);
        message.error(t('workflow.messages.importFailed'));
      }
    };

    // 保存流程
    const saveProcess = async () => {
      try {
        if (!bpmnModeler) return;

        const { xml } = await bpmnModeler.saveXML({ format: true });
        console.log('保存的XML', xml);
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
    const handleBeforeUpload = (file: File) => {
      const reader = new FileReader();
      reader.addEventListener('load', (e) => {
        const xml = e.target?.result as string;
        importBpmnDiagram(xml);
      });
      reader.readAsText(file);
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
      toolbarLang, // 暴露给模板
      toggleToolbarLang, // 暴露切换方法
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
          {{ t('workflow.actions.save') }}
        </AButton>
        <AButton @click="downloadXml">
          <template #icon><DownloadOutlined /></template>
          {{ t('workflow.actions.download') }}
        </AButton>
        <AButton @click="importXml">
          <template #icon><UploadOutlined /></template>
          {{ t('workflow.actions.import') }}
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
            {{ t('workflow.actions.openFile') }}
          </AButton>
        </AUpload>
        <ADivider type="vertical" />
        <AButton
          :type="gridConfig.enabled ? 'primary' : 'default'"
          @click="toggleGrid"
        >
          {{
            gridConfig.enabled
              ? t('workflow.actions.hideGrid')
              : t('workflow.actions.showGrid')
          }}
        </AButton>
        <ASelect
          v-if="gridConfig.enabled"
          v-model:value="gridConfig.size"
          style="width: 120px"
          :options="[
            { value: 10, label: '10px' },
            { value: 20, label: '20px' },
            { value: 30, label: '30px' },
            { value: 40, label: '40px' },
            { value: 50, label: '50px' },
          ]"
        />
        <ADivider type="vertical" />
        <AButton
          @click="toggleToolbarLang"
          :type="toolbarLang === 'en' ? 'primary' : 'default'"
        >
          {{ toolbarLang === 'zh' ? '工具栏显示英文' : '工具栏显示中文' }}
        </AButton>
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
      position: relative; /* 确保子绝对定位元素相对于此元素定位 */
      border-right: 1px solid hsl(var(--border));

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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  border-radius: 6px !important;
  overflow: hidden !important;
}

:deep(.djs-palette-entries) {
  border-color: hsl(var(--border)) !important;
  background-color: hsl(var(--card)) !important;
}

:deep(.djs-palette-entries .entry) {
  border-bottom: 1px solid hsla(var(--border) / 0.3) !important;

  &:hover {
    background-color: hsl(var(--accent-hover)) !important;
  }
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

:deep(
  .bpp-properties-entry input,
  .bpp-properties-entry select,
  .bpp-properties-entry textarea
) {
  background-color: hsl(var(--input-background)) !important;
  border-color: hsl(var(--input)) !important;
  color: hsl(var(--foreground)) !important;
}

// 暗黑主题特殊样式
.bpmn-dark-theme {
  :deep(.bpmn-canvas) {
    background-color: hsl(var(--background-deep)) !important;
  }

  :deep(.djs-palette) {
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6) !important;
    background-color: hsl(var(--card)) !important;
  }

  :deep(.djs-palette-entries .entry) {
    color: hsl(var(--foreground)) !important;
    border-bottom: 1px solid hsla(var(--border) / 0.5) !important;

    &:hover {
      background-color: hsl(var(--accent-hover)) !important;
      color: hsl(var(--foreground)) !important;
    }

    // 确保SVG图标在暗色模式下可见
    svg,
    path,
    polyline,
    circle,
    rect,
    polygon {
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
    svg,
    path,
    polyline,
    circle,
    rect,
    polygon {
      fill: hsl(var(--foreground)) !important;
      stroke: hsl(var(--foreground)) !important;
    }
  }

  // 修改BPMN图形颜色 - 增强对比度
  :deep(.djs-container .djs-shape .djs-visual > :not(.djs-label)) {
    fill: hsl(var(--accent-dark)) !important; // 使用暗色主题的强调色作为填充
    stroke: hsl(
      var(--foreground)
    ) !important; // 使用前景色（通常是白色）作为边框
    stroke-width: 1.5px !important; // 加粗边框以增强可见性
  }

  // 显式处理所有BPMN元素类型
  :deep(
    .djs-container .bpmn-icon-task,
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
    .djs-container .bpmn-icon-text-annotation
  ) {
    fill: hsl(var(--foreground)) !important;
    stroke: hsl(var(--foreground)) !important;
  }

  // 修复开始事件、结束事件等圆形节点
  :deep(
    .djs-container .djs-shape[data-element-id*='StartEvent'] .djs-visual circle,
    .djs-container .djs-shape[data-element-id*='EndEvent'] .djs-visual circle,
    .djs-container
      .djs-shape[data-element-id*='IntermediateEvent']
      .djs-visual
      circle
  ) {
    stroke: hsl(var(--foreground)) !important;
    stroke-width: 2px !important;
    fill: transparent !important; // 圆圈内部透明
  }

  // 特别修复开始事件
  :deep(
    .djs-container .djs-shape[data-element-id*='StartEvent'] .djs-visual circle
  ) {
    fill: transparent !important;
    stroke: hsl(var(--primary)) !important; // 突出显示开始事件
  }

  // 特别修复结束事件
  :deep(
    .djs-container .djs-shape[data-element-id*='EndEvent'] .djs-visual circle
  ) {
    fill: transparent !important;
    stroke: hsl(
      var(--destructive)
    ) !important; // 使用破坏性颜色突出显示结束事件
    stroke-width: 3px !important;
  }

  // 修复任务节点
  :deep(.djs-container .djs-shape[data-element-id*='Task'] .djs-visual rect) {
    fill: hsl(var(--card)) !important;
    stroke: hsl(var(--foreground)) !important;
    stroke-width: 2px !important;
  }

  // 修复网关
  :deep(
    .djs-container .djs-shape[data-element-id*='Gateway'] .djs-visual polygon
  ) {
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
    path,
    circle,
    rect,
    polygon,
    polyline {
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

      svg,
      path,
      polyline,
      circle,
      rect,
      polygon {
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

// 工具栏提示样式
:deep(.djs-tooltip-container) {
  background-color: hsl(var(--card)) !important;
  color: hsl(var(--foreground)) !important;
  border: 1px solid hsl(var(--border)) !important;
  border-radius: 4px !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
  padding: 4px 8px !important;
  font-size: 12px !important;
  z-index: 1100 !important;
}
</style>
