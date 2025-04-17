// @ts-nocheck /* eslint-disable */
<script lang="ts">
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
// 导入Camunda模型描述符
import camundaModdleDescriptor from 'camunda-bpmn-moddle/resources/camunda.json';

// 导入Ant Design国际化 - 作为唯一的语言源
import { antdLocale } from '#/locales';

// 导入样式
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import 'diagram-js-minimap/assets/diagram-js-minimap.css';

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
    <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                      xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                      xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                      xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                      xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                      xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                      id="Definitions_1" 
                      targetNamespace="http://bpmn.io/schema/bpmn">
      <bpmn:process id="Process_1" isExecutable="true" camunda:versionTag="1.0" camunda:candidateStarterGroups="management">
        <bpmn:startEvent id="StartEvent_1" name="开始" camunda:initiator="starter">
          <bpmn:documentation>流程启动事件</bpmn:documentation>
        </bpmn:startEvent>
      </bpmn:process>
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
        <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
          <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
            <dc:Bounds height="36.0" width="36.0" x="173.0" y="102.0"/>
          </bpmndi:BPMNShape>
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

        // 去掉bpmn.io的logo
        const timer = setInterval(() => {
          console.log('1');
          const logo = document.querySelector('.bjs-powered-by');
          if (logo) {
            console.log('2');
            logo.remove();
            clearInterval(timer);
          }
        }, 100);
        
        // 初始化BPMN建模器
        initBpmnModeler();

        // 应用栅格样式
        applyGridStyles();

        // 确保正确设置初始语言
        setTimeout(() => {
          if (bpmnModeler) {
            try {
              // 优先尝试i18n模块
              try {
                const i18n = bpmnModeler.get('i18n');
                if (i18n && typeof i18n.changeLanguage === 'function') {
                  i18n.changeLanguage(currentLocale.value);
                  return; // 成功设置后直接返回
                }
              } catch (error: any) {
                console.warn('尝试使用i18n模块时出错:', error.message);
              }

              // 如果i18n不可用，尝试translate模块
              try {
                const translate = bpmnModeler.get('translate');
                if (
                  translate &&
                  typeof translate.changeLanguage === 'function'
                ) {
                  translate.changeLanguage(currentLocale.value);
                } else {
                  console.warn('无法找到可用的语言切换方法');
                }
              } catch (error: any) {
                console.warn('尝试使用translate模块时出错:', error);
              }
            } catch (error) {
              console.error('组件挂载后设置语言失败:', error);
            }
          }
        }, 200);
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
        // 为bpmn-js准备中文翻译集
        const bpmnTranslations = {
          zh: {
            // 任务类型
            'Activate create/remove space tool': '启动创建/删除空间工具',
            'Activate global connect tool': '启动全局连接工具',
            'Activate hand tool': '启动手动工具',
            'Activate lasso tool': '启动 Lasso 工具',
            'Ad-hoc': 'Ad-hoc子流程',
            'Ad-hoc sub-process (collapsed)': '临时子流程（折叠）',
            'Ad-hoc sub-process (expanded)': '临时子流程（展开）',
            'Add lane above': '在上方添加通道',
            'Add lane below': '在下方添加通道',
            'Add text annotation': '添加文本注释',
            'Append compensation activity': '追加补偿活动',
            'Append conditional intermediate catch event':
              '添加中间条件捕获事件',
            'Append end event': '添加结束事件',
            'Append gateway': '添加网关',
            'Append intermediate/boundary event': '添加中间/边界事件',
            'Append message intermediate catch event': '添加消息中间捕获事件',
            'Append receive task': '添加接收任务',
            'Append signal intermediate catch event': '添加信号中间捕获事件',
            'Append task': '添加任务',
            'Append timer intermediate catch event': '添加定时器中间捕获事件',
            'Business rule task': '规则任务',
            'Call activity': '引用流程',
            'Cancel boundary event': '取消边界事件',
            'Cancel end event': '取消结束事件',
            'Change type': '更改类型',
            Collection: '集合',
            'Compensation boundary event': '补偿边界事件',
            'Compensation end event': '结束补偿事件',
            'Compensation intermediate throw event': '中间补偿抛出事件',
            'Compensation start event': '补偿启动事件',
            'Complex gateway': '复杂网关',
            'Conditional boundary event': '条件边界事件',
            'Conditional boundary event (non-interrupting)':
              '条件边界事件 (非中断)',
            'Conditional flow': '条件流',
            'Conditional intermediate catch event': '中间条件捕获事件',
            'Conditional start event': '条件启动事件',
            'Conditional start event (non-interrupting)':
              '条件启动事件 (非中断)',
            'Connect to other element': '连接到其他元素',
            'Connect using association': '文本关联',
            'Connect using data input association': '数据关联',
            'Connect using sequence/message flow or association': '消息关联',
            'Create data object reference': '创建数据对象引用',
            'Create data store reference': '创建数据存储引用',
            'Create end event': '创建结束事件',
            'Create expanded sub-process': '创建可折叠子流程',
            'Create gateway': '创建网关',
            'Create group': '创建组',
            'Create intermediate/boundary event': '创建中间/边界事件',
            'Create pool/participant': '创建池/参与者',
            'Create start event': '创建开始事件',
            'Create task': '创建任务',
            'Data object reference': '数据对象引用',
            'Data store reference': '数据存储引用',
            'Default flow': '默认流',
            Delete: '删除',
            'Divide into three lanes': '分成三条通道',
            'Divide into two lanes': '分成两条通道',
            'Empty pool/participant': '空泳道',
            'Empty pool/participant (removes content)': '清空泳道（删除内容）',
            'End event': '结束事件',
            'Error boundary event': '错误边界事件',
            'Error end event': '结束错误事件',
            'Error start event': '错误启动事件',
            'Escalation boundary event': '升级边界事件',
            'Escalation boundary event (non-interrupting)':
              '升级边界事件 (非中断)',
            'Escalation end event': '结束升级事件',
            'Escalation intermediate throw event': '中间升级抛出事件',
            'Escalation start event': '升级启动事件',
            'Escalation start event (non-interrupting)':
              '升级启动事件 (非中断)',
            'Event sub-process': '事件子流程',
            'Event-based gateway': '事件网关',
            'Exclusive gateway': '独占网关',
            'Inclusive gateway': '包容网关',
            'Intermediate throw event': '中间抛出事件',
            'Link intermediate catch event': '中间链接捕获事件',
            'Link intermediate throw event': '中间链接抛出事件',
            Loop: '循环',
            'Manual task': '手动任务',
            'Message boundary event': '消息边界事件',
            'Message boundary event (non-interrupting)':
              '消息边界事件 (非中断)',
            'Message end event': '结束消息事件',
            'Message intermediate catch event': '中间消息捕获事件',
            'Message intermediate throw event': '中间消息抛出事件',
            'Message start event': '消息启动事件',
            'Message start event (non-interrupting)': '消息启动事件 (非中断)',
            'Open {element}': '打开 {element}',
            'Parallel gateway': '并行网关',
            'Parallel multi-instance': '并行多实例',
            'Participant multiplicity': '参与者多重性',
            'Receive task': '接受任务',
            Remove: '移除',
            'Script task': '脚本任务',
            'Search in diagram': '在图表中搜索',
            'Send task': '发送任务',
            'Sequence flow': '顺序流',
            'Sequential multi-instance': '串行多实例',
            'Service task': '服务任务',
            'Signal boundary event': '信号边界事件',
            'Signal boundary event (non-interrupting)': '信号边界事件 (非中断)',
            'Signal end event': '结束信号事件',
            'Signal intermediate catch event': '中间信号捕获事件',
            'Signal intermediate throw event': '中间信号抛出事件',
            'Signal start event': '信号启动事件',
            'Signal start event (non-interrupting)': '信号启动事件 (非中断)',
            'Start event': '开始事件',
            'Sub-process': '子流程',
            'Sub-process (collapsed)': '可折叠子流程',
            'Sub-process (expanded)': '可展开子流程',
            Task: '任务',
            'Terminate end event': '终止边界事件',
            'Timer boundary event': '定时边界事件',
            'Timer boundary event (non-interrupting)': '定时边界事件 (非中断)',
            'Timer intermediate catch event': '中间定时捕获事件',
            'Timer start event': '定时启动事件',
            'Timer start event (non-interrupting)': '定时启动事件 (非中断)',
            Transaction: '事务',
            'User task': '用户任务',
            'already rendered {element}': '{element} 已呈现',
            'correcting missing bpmnElement on {plane} to {rootElement}':
              '在 {plane} 上更正缺失的 bpmnElement 为 {rootElement}',
            'diagram not part of bpmn:Definitions':
              '图表不是 bpmn:Definitions 的一部分',
            'element required': '需要元素',
            'element {element} referenced by {referenced}#{property} not yet drawn':
              '元素 {element} 的引用 {referenced}#{property} 尚未绘制',
            'failed to import {element}': '{element} 导入失败',
            'flow elements must be children of pools/participants':
              '元素必须是池/参与者的子级',
            'missing {semantic}#attachedToRef':
              '在 {element} 中缺少 {semantic}#attachedToRef',
            'more than {count} child lanes': '超过 {count} 条通道',
            'multiple DI elements defined for {element}':
              '为 {element} 定义了多个 DI 元素',
            'no bpmnElement referenced in {element}':
              '{element} 中没有引用 bpmnElement',
            'no diagram to display': '没有要显示的图表',
            'no parent for {element} in {parent}':
              '在 {element} 中没有父元素 {parent}',
            'no process or collaboration to display': '没有可显示的流程或协作',
            'no shape type specified': '未指定形状类型',
            'out of bounds release': '越界释放',
            'Open minimap': '打开缩略图',
            'Close minimap': '关闭缩略图',
            // 添加Camunda属性面板相关翻译
            'General': '常规',
            'Details': '详情',
            'Documentation': '文档',
            'Implementation': '实现',
            'Id': '标识',
            'Name': '名称',
            'Version Tag': '版本标签',
            'Executable': '可执行',
            'Execution Listener': '执行监听器',
            'Candidate Starter Groups': '候选启动组',
            'Candidate Starter Users': '候选启动用户',
            'Job Configuration': '作业配置',
            'Task Listener': '任务监听器',
            'Form Fields': '表单字段',
            'Form Key': '表单键值',
            'Form Properties': '表单属性',
            'History Configuration': '历史配置',
            'Initiator': '发起人',
            'Correlation Key': '关联键',
            'Due Date': '到期日期',
            'Follow Up Date': '跟进日期',
            'Priority': '优先级',
            'Retry Time Cycle': '重试时间周期',
            'Assignee': '受理人',
            'Candidate Users': '候选用户',
            'Candidate Groups': '候选组',
            'Results Variable': '结果变量',
            'Class': '类',
            'Delegate Expression': '委托表达式',
            'External Resource': '外部资源',
            'Type': '类型',
            'Topic': '主题',
            'Input Output': '输入输出',
            'Input Parameters': '输入参数',
            'Output Parameters': '输出参数',
            'Timer Definition Type': '定时器定义类型',
            'Timer Definition': '定时器定义',
            'Date': '日期',
            'Duration': '持续时间',
            'Message': '消息',
            'Message Name': '消息名称',
            'Condition': '条件',
            'Variable Event': '变量事件',
            'Variable Name': '变量名称',
            'Variables': '变量',
            'Multi Instance': '多实例',
            'Loop Cardinality': '循环基数',
            'Completion Condition': '完成条件',
            'Properties': '属性',
            'Property': '属性',
            'Value': '值',
            'Asynchronous Continuations': '异步持续',
            'Asynchronous Before': '前置异步',
            'Asynchronous After': '后置异步',
            'Exclusive': '排他',
            'Call Activity': '调用活动',
            'Called Element': '被调用元素',
            'Business Key': '业务键',
            'Inherit Variables': '继承变量',
            'Local Variables': '本地变量',
            // 添加新的Camunda属性面板翻译（已去除重复项）
            'Extension Properties': '扩展属性',
            'Add Property': '添加属性',
            'Process ID': '流程ID',
            'Process Name': '流程名称',
            'Job Execution': '作业执行',
            'Listener': '监听器',
            'Event Type': '事件类型',
            'Listener Type': '监听器类型',
            'Java Class': 'Java类',
            'Script': '脚本',
            'Inline Script': '内联脚本',
            'Resource': '资源',
            'Extensions': '扩展',
            'Element Documentation': '元素文档',
            'Process Documentation': '流程文档',
            'Connector': '连接器',
            'Connector ID': '连接器ID',
            'Source': '源',
            'Source Expression': '源表达式',
            'Target': '目标',
            'Target Expression': '目标表达式',
            'Template': '模板',
            'Target Namespace': '目标命名空间',
            'Parameters': '参数',
            'External Task Configuration': '外部任务配置',
            'Task Priority': '任务优先级',
            'Is For Compensation': '用于补偿',
            'Error Code': '错误代码',
            'Error Message': '错误消息',
            'Add Error': '添加错误',
            'Element Documentation Text': '元素文档文本',
            'Process Documentation Text': '流程文档文本',
            'Escalation Code': '升级代码',
            'Input Mapping': '输入映射',
            'Output Mapping': '输出映射',
            'Time Duration': '时间持续时间',
            'Time Date': '时间日期',
            'Time Cycle': '时间周期',
            'Mapping': '映射',
            'Validate': '验证',
            'Constraints': '约束条件',
            
            // 添加截图中显示的未翻译项目
            'History cleanup': '历史清理',
            'Time to live': '生存时间',
            'Tasklist': '任务列表',
            'Startable': '可启动',
            'Candidate starter': '候选启动者',
            'Specify more than one group as a comma separated list.': '指定多个组，请使用逗号分隔列表。',
            'Specify more than one user as a comma separated list.': '指定多个用户，请使用逗号分隔列表。',
            
            // 添加更多常见流程相关术语翻译 (仅添加未重复的键)
            'Process Variables': '流程变量',
            'Input/Output': '输入/输出',
            'Timer Cycle': '定时器周期',
            'Task Type': '任务类型',
            'Assignee Type': '分配类型',
            'Assignee Value': '分配值',
            'Candidate Users Type': '候选用户类型',
            'Candidate Users Value': '候选用户值',
            'Candidate Groups Type': '候选组类型',
            'Candidate Groups Value': '候选组值',
            'Due Date Type': '到期日期类型',
            'Due Date Value': '到期日期值',
            'Follow Up Date Type': '跟进日期类型',
            'Follow Up Date Value': '跟进日期值',
            'Priority Type': '优先级类型',
            'Priority Value': '优先级值',
            'Retry Time Cycle Type': '重试时间周期类型',
            'Retry Time Cycle Value': '重试时间周期值',
            'Task Definition Type': '任务定义类型',
            'Task Definition Key': '任务定义键',
            'Process Definition Key': '流程定义键',
            'Process Instance Id': '流程实例ID',
            'Process Instance Business Key': '流程实例业务键',
            'Execution Id': '执行ID',
            'Case Instance Id': '案例实例ID',
            'Case Definition Key': '案例定义键',
            'Case Execution Id': '案例执行ID',
            'Task Id': '任务ID',
            'Add Constraint': '添加约束',
            'Add Parameter': '添加参数',
            'Add Input Parameter': '添加输入参数',
            'Add Output Parameter': '添加输出参数',
            'Add Execution Listener': '添加执行监听器',
            'Add Task Listener': '添加任务监听器',
            'Add Extension Element': '添加扩展元素',
            'Empty': '空',
            'Create new': '创建新的',
            'Save': '保存',
            'Cancel': '取消',
            'Class Name': '类名',
            'Script Type': '脚本类型',
            'Script Value': '脚本值',
            'External': '外部',
            'External Type': '外部类型',
            'External Topic': '外部主题',
            'External Task Priority': '外部任务优先级',
            'External Task Retry Time': '外部任务重试时间',
            'External Task Retry Time Cycle': '外部任务重试时间周期',
            'Specify more than one value as a comma separated list': '指定多个值，请使用逗号分隔列表',
            'Specify values as a comma separated list': '指定值，请使用逗号分隔列表',
            'Add': '添加',
            'Edit': '编辑',
            'Move Up': '上移',
            'Move Down': '下移',
            'Expression Language': '表达式语言',
            'Script Language': '脚本语言',
            'Condition Expression': '条件表达式',
            'Variable Value': '变量值',
            'Variable Type': '变量类型',
            'String': '字符串',
            'Integer': '整数',
            'Boolean': '布尔值',
            'Object': '对象',
            'List': '列表',
            'Map': '映射',
            'Warning': '警告',
            'Information': '信息',
            'Success': '成功',
            'Failure': '失败',
            'Timeout': '超时',
            'Compensation': '补偿',
            'Link': '链接',
            'None': '无',
            'All': '全部',
            'Required': '必填',
            'Optional': '可选',
            'Read-only': '只读',
            'Writable': '可写',
            'Hidden': '隐藏',
            'Visible': '可见',
            'Automatic': '自动',
            'Manual': '手动',
            'Create': '创建',
            'Read': '读取',
            'Update': '更新',
            'Start': '开始',
            'End': '结束',
            'Complete': '完成',
            'Activate': '激活',
            'Suspend': '挂起',
            'Resume': '恢复',
            'Delegate': '委托',
            'Resolve': '解决',
            'Claim': '认领',
            'Unclaim': '取消认领',
            
            // 添加字段注入相关翻译
            'Field Injection': '字段注入',
            'Field Name': '字段名称',
            'Field Type': '字段类型',
            'Field Value': '字段值',
            'Field String': '字段字符串',
            'Field Expression': '字段表达式',
            
            // 添加表单相关翻译
            'Form Reference': '表单引用',
            'Form Field Id': '表单字段ID',
            'Form Field Label': '表单字段标签',
            'Form Field Type': '表单字段类型',
            'Form Field Default Value': '表单字段默认值',
            'Form Field Properties': '表单字段属性',
            'Form Field Validation': '表单字段验证',
            'Form Field Constraints': '表单字段约束',
            'Form Field Values': '表单字段值',
            'Form Field Value Id': '表单字段值ID',
            'Form Field Value Name': '表单字段值名称',
            
            // 添加参数相关翻译
            'Input Parameter Name': '输入参数名称',
            'Input Parameter Value': '输入参数值',
            'Output Parameter Name': '输出参数名称',
            'Output Parameter Value': '输出参数值',
            
            // 添加监听器相关翻译
            'Execution Listener Event': '执行监听器事件',
            'Execution Listener Field Injection': '执行监听器字段注入',
            'Task Listener Event': '任务监听器事件',
            'Task Listener Field Injection': '任务监听器字段注入',
            
            // 添加其他重要翻译
            'Expression': '表达式',
            'Signal Name': '信号名称',
            'Signal Reference': '信号引用',
            'Link Name': '链接名称',
            'Timer Definition Value': '定时器定义值',
            'Calendar Name': '日历名称',
            'Retry Delay': '重试延迟',
            'External Service Task': '外部服务任务',
            'External Service Task Topic': '外部服务任务主题',
            'External Service Task Priority': '外部服务任务优先级',
            'External Service Task Retry Time': '外部服务任务重试时间',
            'External Service Task Retry Time Cycle': '外部服务任务重试时间周期',
            'External Service Task Properties': '外部服务任务属性',
            'Job Priority': '作业优先级',
            'Job Retry Time Cycle': '作业重试时间周期',
            'Exclusive Job': '排他作业',
            'Job Resource': '作业资源',
            'Job Type': '作业类型',
            'Job Worker': '作业工作器',
            'Job Header': '作业头信息',
            'Job Header Name': '作业头信息名称',
            'Job Header Value': '作业头信息值',
            'Process History': '流程历史',
            'Process History Time To Live': '流程历史生存时间',
            'Description': '描述',
            'Category': '类别',
            'Tenant Id': '租户ID'
          },
          en: {
            // 英文使用默认翻译，可以根据需要添加自定义的英文翻译
            'Activate create/remove space tool':
              'Activate create/remove space tool',
            'Activate global connect tool': 'Activate global connect tool',
            'Activate hand tool': 'Activate hand tool',
            'Activate lasso tool': 'Activate lasso tool',
            'Ad-hoc': 'Ad-hoc',
            'Ad-hoc sub-process (collapsed)': 'Ad-hoc sub-process (collapsed)',
            'Ad-hoc sub-process (expanded)': 'Ad-hoc sub-process (expanded)',
            'Add lane above': 'Add lane above',
            'Add lane below': 'Add lane below',
            'Add text annotation': 'Add text annotation',
            'Align elements': 'Align elements',
            'Align elements bottom': 'Align elements bottom',
            'Align elements center': 'Align elements center',
            'Align elements left': 'Align elements left',
            'Align elements middle': 'Align elements middle',
            'Align elements right': 'Align elements right',
            'Align elements top': 'Align elements top',
            'Append compensation activity': 'Append compensation activity',
            'Append conditional intermediate catch event':
              'Append conditional intermediate catch event',
            'Append end event': 'Append end event',
            'Append gateway': 'Append gateway',
            'Append intermediate/boundary event':
              'Append intermediate/boundary event',
            'Append message intermediate catch event':
              'Append message intermediate catch event',
            'Append receive task': 'Append receive task',
            'Append signal intermediate catch event':
              'Append signal intermediate catch event',
            'Append task': 'Append task',
            'Append text annotation': 'Append text annotation',
            'Append timer intermediate catch event':
              'Append timer intermediate catch event',
            'Business rule task': 'Business rule task',
            'Call activity': 'Call activity',
            'Cancel boundary event': 'Cancel boundary event',
            'Cancel end event': 'Cancel end event',
            'Change element': 'Change element',
            'Change type': 'Change type',
            Collection: 'Collection',
            'Compensation boundary event': 'Compensation boundary event',
            'Compensation end event': 'Compensation end event',
            'Compensation intermediate throw event':
              'Compensation intermediate throw event',
            'Compensation start event': 'Compensation start event',
            'Complex gateway': 'Complex gateway',
            'Conditional boundary event': 'Conditional boundary event',
            'Conditional boundary event (non-interrupting)':
              'Conditional boundary event (non-interrupting)',
            'Conditional flow': 'Conditional flow',
            'Conditional intermediate catch event':
              'Conditional intermediate catch event',
            'Conditional start event': 'Conditional start event',
            'Conditional start event (non-interrupting)':
              'Conditional start event (non-interrupting)',
            'Connect to other element': 'Connect to other element',
            'Connect using association': 'Connect using association',
            'Connect using data input association':
              'Connect using data input association',
            'Connect using sequence/message flow or association':
              'Connect using sequence/message flow or association',
            'Create data object reference': 'Create data object reference',
            'Create data store reference': 'Create data store reference',
            'Create end event': 'Create end event',
            'Create expanded sub-process': 'Create expanded sub-process',
            'Create gateway': 'Create gateway',
            'Create group': 'Create group',
            'Create intermediate/boundary event':
              'Create intermediate/boundary event',
            'Create pool/participant': 'Create pool/participant',
            'Create start event': 'Create start event',
            'Create task': 'Create task',
            'Data object reference': 'Data object reference',
            'Data store reference': 'Data store reference',
            'Default flow': 'Default flow',
            Delete: 'Delete',
            'Distribute elements horizontally':
              'Distribute elements horizontally',
            'Distribute elements vertically': 'Distribute elements vertically',
            'Divide into three lanes': 'Divide into three lanes',
            'Divide into two lanes': 'Divide into two lanes',
            'Empty pool/participant': 'Empty pool/participant',
            'Empty pool/participant (removes content)':
              'Empty pool/participant (removes content)',
            'End event': 'End event',
            'Error boundary event': 'Error boundary event',
            'Error end event': 'Error end event',
            'Error start event': 'Error start event',
            'Escalation boundary event': 'Escalation boundary event',
            'Escalation boundary event (non-interrupting)':
              'Escalation boundary event (non-interrupting)',
            'Escalation end event': 'Escalation end event',
            'Escalation intermediate throw event':
              'Escalation intermediate throw event',
            'Escalation start event': 'Escalation start event',
            'Escalation start event (non-interrupting)':
              'Escalation start event (non-interrupting)',
            'Event sub-process': 'Event sub-process',
            'Event-based gateway': 'Event-based gateway',
            'Exclusive gateway': 'Exclusive gateway',
            'Inclusive gateway': 'Inclusive gateway',
            'Intermediate throw event': 'Intermediate throw event',
            'Link intermediate catch event': 'Link intermediate catch event',
            'Link intermediate throw event': 'Link intermediate throw event',
            Loop: 'Loop',
            'Manual task': 'Manual task',
            'Message boundary event': 'Message boundary event',
            'Message boundary event (non-interrupting)':
              'Message boundary event (non-interrupting)',
            'Message end event': 'Message end event',
            'Message intermediate catch event':
              'Message intermediate catch event',
            'Message intermediate throw event':
              'Message intermediate throw event',
            'Message start event': 'Message start event',
            'Message start event (non-interrupting)':
              'Message start event (non-interrupting)',
            'Open {element}': 'Open {element}',
            'Parallel gateway': 'Parallel gateway',
            'Parallel multi-instance': 'Parallel multi-instance',
            'Participant multiplicity': 'Participant multiplicity',
            'Receive task': 'Receive task',
            Remove: 'Remove',
            'Script task': 'Script task',
            'Search in diagram': 'Search in diagram',
            'Send task': 'Send task',
            'Sequence flow': 'Sequence flow',
            'Sequential multi-instance': 'Sequential multi-instance',
            'Service task': 'Service task',
            'Signal boundary event': 'Signal boundary event',
            'Signal boundary event (non-interrupting)':
              'Signal boundary event (non-interrupting)',
            'Signal end event': 'Signal end event',
            'Signal intermediate catch event':
              'Signal intermediate catch event',
            'Signal intermediate throw event':
              'Signal intermediate throw event',
            'Signal start event': 'Signal start event',
            'Signal start event (non-interrupting)':
              'Signal start event (non-interrupting)',
            'Start event': 'Start event',
            'Sub-process': 'Sub-process',
            'Sub-process (collapsed)': 'Sub-process (collapsed)',
            'Sub-process (expanded)': 'Sub-process (expanded)',
            Task: 'Task',
            'Terminate end event': 'Terminate end event',
            'Timer boundary event': 'Timer boundary event',
            'Timer boundary event (non-interrupting)':
              'Timer boundary event (non-interrupting)',
            'Timer intermediate catch event': 'Timer intermediate catch event',
            'Timer start event': 'Timer start event',
            'Timer start event (non-interrupting)':
              'Timer start event (non-interrupting)',
            'Toggle non-interrupting': 'Toggle non-interrupting',
            Transaction: 'Transaction',
            'User task': 'User task',
            'already rendered {element}': 'already rendered {element}',
            'correcting missing bpmnElement on {plane} to {rootElement}':
              'correcting missing bpmnElement on {plane} to {rootElement}',
            'diagram not part of bpmn:Definitions':
              'diagram not part of bpmn:Definitions',
            'element required': 'element required',
            'element {element} referenced by {referenced}#{property} not yet drawn':
              'element {element} referenced by {referenced}#{property} not yet drawn',
            'failed to import {element}': 'failed to import {element}',
            'flow elements must be children of pools/participants':
              'flow elements must be children of pools/participants',
            'missing {semantic}#attachedToRef':
              'missing {semantic}#attachedToRef',
            'more than {count} child lanes': 'more than {count} child lanes',
            'multiple DI elements defined for {element}':
              'multiple DI elements defined for {element}',
            'no bpmnElement referenced in {element}':
              'no bpmnElement referenced in {element}',
            'no diagram to display': 'no diagram to display',
            'no parent for {element} in {parent}':
              'no parent for {element} in {parent}',
            'no plane for {element}': 'no plane for {element}',
            'no process or collaboration to display':
              'no process or collaboration to display',
            'no shape type specified': 'no shape type specified',
            'out of bounds release': 'out of bounds release',
            'unknown di {di} for element {semantic}':
              'unknown di {di} for element {semantic}',
            'unrecognized flowElement {element} in context {context}':
              'unrecognized flowElement {element} in context {context}',
            'unsupported bpmnElement for {plane}: {rootElement}':
              'unsupported bpmnElement for {plane}: {rootElement}',
            '{semantic}#{side} Ref not specified':
              '{semantic}#{side} Ref not specified',
            // 添加新的Camunda属性面板英文翻译
            'Extension Properties': 'Extension Properties',
            'Add Property': 'Add Property',
            'Process ID': 'Process ID',
            'Process Name': 'Process Name',
            'Job Execution': 'Job Execution',
            'Listener': 'Listener',
            'Event Type': 'Event Type',
            'Listener Type': 'Listener Type',
            'Java Class': 'Java Class',
            'Extensions': 'Extensions',
            'Element Documentation': 'Element Documentation',
            'Process Documentation': 'Process Documentation',
            'Connector': 'Connector',
            'Connector ID': 'Connector ID',
            'Source': 'Source',
            'Source Expression': 'Source Expression',
            'Target': 'Target',
            'Target Expression': 'Target Expression',
            'Template': 'Template',
            'Target Namespace': 'Target Namespace',
            'Parameters': 'Parameters',
            'External Task Configuration': 'External Task Configuration',
            'Task Priority': 'Task Priority',
            'Is For Compensation': 'Is For Compensation',
            'Error Code': 'Error Code',
            'Error Message': 'Error Message',
            'Add Error': 'Add Error',
            'Element Documentation Text': 'Element Documentation Text',
            'Process Documentation Text': 'Process Documentation Text',
            'Escalation Code': 'Escalation Code',
            'Input Mapping': 'Input Mapping',
            'Output Mapping': 'Output Mapping',
            'Time Duration': 'Time Duration',
            'Time Date': 'Time Date', 
            'Time Cycle': 'Time Cycle',
            'Mapping': 'Mapping',
            'Validate': 'Validate',
            'Constraints': 'Constraints'
          },
        };

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
        <AButton @click="importXml">
          <template #icon>
            <UploadOutlined />
          </template>
          {{ t('workflow.actions.import') }}
        </AButton>
        <AUpload ref="uploadRef" :show-upload-list="false" accept=".bpmn, .xml" :before-upload="handleBeforeUpload"
          :multiple="false">
          <AButton>
            <template #icon>
              <FolderOutlined />
            </template>
            {{ t('workflow.actions.openFile') }}
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
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    
    :deep(.ant-card-body) {
      padding: 12px 16px; // 稍微减小内边距，使工具栏更紧凑
    }
  }

  .bpmn-content-wrapper {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: calc(100vh - 180px); // 调整高度
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    border-top-left-radius: 0; // 移除顶部圆角，与工具栏对接
    border-top-right-radius: 0; // 移除顶部圆角，与工具栏对接
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
    border-top-left-radius: 0; // 移除顶部圆角，与工具栏对接
    border-top-right-radius: 0; // 移除顶部圆角，与工具栏对接
    border-top: none; // 移除顶部边框，与工具栏衔接

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
  background-color: hsl(var(--card)) !important;
}

:deep(.djs-palette-entries .entry) {
  border-bottom: 1px solid hsla(var(--border) / 0.3) !important;

  &:hover {
    background-color: hsl(var(--accent-hover)) !important;
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
    .djs-popup-search input {
      background-color: hsl(var(--input)) !important;
      color: hsl(var(--foreground)) !important;
      border: 1px solid hsl(var(--border)) !important;

      &:focus {
        background-color: hsla(var(--primary) / 0.1) !important;
        border-color: hsl(var(--primary)) !important;
        outline: none !important;
        box-shadow: 0 0 0 2px hsla(var(--primary) / 0.2) !important;
      }
    }

    // 修复搜索图标
    .djs-popup-search-icon {
      color: hsl(var(--muted-foreground)) !important;
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
    padding: 3px !important;
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
      padding: 4px 8px !important;

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
  :deep(.bjs-powered-by) {
    display: none !important;
  }
  .bjs-powered-by, [title="Powered by bpmn.io"] {
  display: none !important;
}
}
</style>
