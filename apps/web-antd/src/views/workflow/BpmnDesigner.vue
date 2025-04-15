<script lang="ts">
// 添加全局错误处理以消除特定警告 - 错误抑制模块
(function() {
  // 替换 console.warn 来屏蔽特定警告
  const originalWarn = console.warn;
  console.warn = function() {
    // 检查是否是关于ContextPad#getPad的弃用警告
    if (arguments.length > 0 && 
        typeof arguments[0] === 'string' && 
        arguments[0].includes('ContextPad#getPad is deprecated')) {
      return; // 忽略此警告
    }
    return originalWarn.apply(console, arguments);
  };
  
  // 添加全局错误处理器
  window.addEventListener('error', function(event) {
    // 检查是否是ContextPad#getPad相关的错误
    if (event && event.error && event.error.message && 
        event.error.message.includes('ContextPad#getPad is deprecated')) {
      // 阻止默认处理
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
})();

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
// 导入Ant Design国际化 - 作为唯一的语言源
import { antdLocale } from '#/locales';

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

// 导入官方翻译模块
import translateModule from 'diagram-js/lib/i18n/translate';

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

    // 翻译函数
    const t = (key, ...args) => {
      try {
        // 确保正确的键名路径
        // 如果key已经包含workflow前缀，则直接使用
        const fullKey = key.startsWith('workflow.') ? key : `workflow.${key}`;
        const result = originalT(fullKey, ...args);

        // 如果返回结果是对象或undefined，尝试使用原始键
        if (typeof result !== 'string' || result === fullKey) {
          return originalT(key, ...args) || key;
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
      if (locale === 'en_US') {
        currentLocale.value = 'en';
      } else {
        currentLocale.value = 'zh';
      }
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
    let bpmnModeler = null;

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
      (newLocale, oldLocale) => {
        try {
          if (!newLocale) return;
          
          console.log('%c[BPMN语言111]', 'color:orange', '检测到Ant Design语言变化:', newLocale.locale);
          
          const isNewLocaleEn = newLocale.locale === 'en';
          
          // 映射到BPMN支持的格式
          let bpmnLocale = isNewLocaleEn ? 'en' : 'zh';
          
          console.log('%c[BPMN语言]', 'color:orange', `映射语言: ${newLocale.locale} => ${bpmnLocale}`);
          console.log('%c[BPMN语言]', 'color:orange', `当前BPMN语言: ${currentLocale.value}`);
          
          // 只有当语言发生变化时才更新
          if (currentLocale.value !== bpmnLocale) {
            console.log('%c[BPMN语言]', 'color:green', `正在切换BPMN设计器语言: ${currentLocale.value} → ${bpmnLocale}`);
            
            // 更新当前语言变量
            currentLocale.value = bpmnLocale;
            
            // 确保BpmnModeler已初始化
            if (bpmnModeler) {
              try {
                // 首先尝试使用translate模块（一定存在）
                const translate = bpmnModeler.get('translate');
                let changeSuccess = false;
                
                if (translate && typeof translate.changeLanguage === 'function') {
                  translate.changeLanguage(bpmnLocale);
                  console.log('%c[BPMN语言]', 'color:green', `通过translate模块切换语言到: ${bpmnLocale}`);
                  changeSuccess = true;
                }
                
                // 然后尝试使用i18n模块（可能不存在）
                try {
                  const i18n = bpmnModeler.get('i18n');
                  if (i18n && typeof i18n.changeLanguage === 'function') {
                    i18n.changeLanguage(bpmnLocale);
                    console.log('%c[BPMN语言]', 'color:green', `通过i18n模块切换语言到: ${bpmnLocale}`);
                    changeSuccess = true;
                  }
                } catch (i18nError) {
                  // i18n模块不可用，忽略错误
                  console.log('%c[BPMN语言]', 'color:orange', 'i18n模块不可用，已使用translate模块');
                }
                
                if (changeSuccess) {
                  // 强制重绘画布
                  const canvas = bpmnModeler.get('canvas');
                  if (canvas) {
                    // 先缩小再缩放回来，以强制刷新视图
                    const currentZoom = canvas.zoom();
                    canvas.zoom(currentZoom * 0.99);
                    setTimeout(() => {
                      canvas.zoom(currentZoom);
                    }, 50);
                  }
                  
                  // 显示成功消息
                  message.success(`BPMN设计器语言已切换到${bpmnLocale === 'zh' ? '中文' : '英文'}`);
                } else {
                  console.error('%c[BPMN语言]', 'color:red', '没有找到可用的语言切换方法');
                  
                  // 尝试重新初始化整个modeler
                  console.log('%c[BPMN语言]', 'color:orange', '尝试通过重新初始化来应用新语言...');
                  
                  // 保存当前图表并重新初始化
                  bpmnModeler.saveXML({ format: true }).then(({ xml }) => {
                    // 销毁当前modeler
                    bpmnModeler.destroy();
                    bpmnModeler = null;
                    
                    // 重新初始化
                    setTimeout(() => {
                      initBpmnModeler();
                      
                      // 导入保存的图表
                      setTimeout(() => {
                        if (bpmnModeler) {
                          bpmnModeler.importXML(xml).catch(e => {
                            console.error('[BPMN] 重新导入图表失败:', e);
                          });
                        }
                      }, 100);
                    }, 100);
                  }).catch(e => {
                    console.error('[BPMN] 保存当前图表失败:', e);
                  });
                }
              } catch (e) {
                console.error('%c[BPMN语言]', 'color:red', '切换语言时发生错误:', e);
              }
            }
          } else {
            console.log('%c[BPMN语言]', 'color:blue', `语言未变化，保持: ${bpmnLocale}`);
          }
        } catch (e) {
          console.error('%c[BPMN语言]', 'color:red', '监听语言变化时出错:', e);
        }
      },
      { immediate: true, deep: true }
    );

    // 在组件挂载时初始化
    onMounted(() => {
      try {
        // 初始化BPMN建模器
        initBpmnModeler();
        
        // 应用栅格样式
        applyGridStyles();
        
        // 确保正确设置初始语言
        setTimeout(() => {
          if (bpmnModeler) {
            try {
              console.log('%c[BPMN挂载]', 'color:green', `开始设置初始语言: ${currentLocale.value}`);
              
              // 优先尝试i18n模块
              try {
                const i18n = bpmnModeler.get('i18n');
                if (i18n && typeof i18n.changeLanguage === 'function') {
                  i18n.changeLanguage(currentLocale.value);
                  console.log('%c[BPMN挂载]', 'color:green', `通过i18n模块设置初始语言: ${currentLocale.value}`);
                  return; // 成功设置后直接返回
                }
              } catch (i18nErr) {
                console.log('%c[BPMN挂载]', 'color:orange', '尝试使用i18n模块时出错:', i18nErr.message);
              }
              
              // 如果i18n不可用，尝试translate模块
              try {
                const translate = bpmnModeler.get('translate');
                if (translate && typeof translate.changeLanguage === 'function') {
                  translate.changeLanguage(currentLocale.value);
                  console.log('%c[BPMN挂载]', 'color:green', `通过translate模块设置初始语言: ${currentLocale.value}`);
                } else {
                  console.warn('%c[BPMN挂载]', 'color:orange', '无法找到可用的语言切换方法');
                }
              } catch (translateErr) {
                console.warn('%c[BPMN挂载]', 'color:orange', '尝试使用translate模块时出错:', translateErr.message);
              }
            } catch (e) {
              console.error('[BPMN] 组件挂载后设置语言失败:', e);
            }
          }
        }, 200);
      } catch (e) {
        console.error('[BPMN] 组件挂载过程中出错:', e);
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
          'zh': {
            // 任务类型
             "Activate create/remove space tool": "启动创建/删除空间工具",
  "Activate global connect tool": "启动全局连接工具",
  "Activate hand tool": "启动手动工具",
  "Activate lasso tool": "启动 Lasso 工具",
  "Ad-hoc": "Ad-hoc子流程",
  "Ad-hoc sub-process (collapsed)": "临时子流程（折叠）",
  "Ad-hoc sub-process (expanded)": "临时子流程（展开）",
  "Add lane above": "在上方添加通道",
  "Add lane below": "在下方添加通道",
  "Add text annotation": "添加文本注释",
  "Append compensation activity": "追加补偿活动",
  "Append conditional intermediate catch event": "添加中间条件捕获事件",
  "Append end event": "添加结束事件",
  "Append gateway": "添加网关",
  "Append intermediate/boundary event": "添加中间/边界事件",
  "Append message intermediate catch event": "添加消息中间捕获事件",
  "Append receive task": "添加接收任务",
  "Append signal intermediate catch event": "添加信号中间捕获事件",
  "Append task": "添加任务",
  "Append timer intermediate catch event": "添加定时器中间捕获事件",
  "Business rule task": "规则任务",
  "Call activity": "引用流程",
  "Cancel boundary event": "取消边界事件",
  "Cancel end event": "取消结束事件",
  "Change type": "更改类型",
  "Collection": "集合",
  "Compensation boundary event": "补偿边界事件",
  "Compensation end event": "结束补偿事件",
  "Compensation intermediate throw event": "中间补偿抛出事件",
  "Compensation start event": "补偿启动事件",
  "Complex gateway": "复杂网关",
  "Conditional boundary event": "条件边界事件",
  "Conditional boundary event (non-interrupting)": "条件边界事件 (非中断)",
  "Conditional flow": "条件流",
  "Conditional intermediate catch event": "中间条件捕获事件",
  "Conditional start event": "条件启动事件",
  "Conditional start event (non-interrupting)": "条件启动事件 (非中断)",
  "Connect to other element": "连接到其他元素",
  "Connect using association": "文本关联",
  "Connect using data input association": "数据关联",
  "Connect using sequence/message flow or association": "消息关联",
  "Create data object reference": "创建数据对象引用",
  "Create data store reference": "创建数据存储引用",
  "Create end event": "创建结束事件",
  "Create expanded sub-process": "创建可折叠子流程",
  "Create gateway": "创建网关",
  "Create group": "创建组",
  "Create intermediate/boundary event": "创建中间/边界事件",
  "Create pool/participant": "创建池/参与者",
  "Create start event": "创建开始事件",
  "Create task": "创建任务",
  "Data object reference": "数据对象引用",
  "Data store reference": "数据存储引用",
  "Default flow": "默认流",
  "Delete": "删除",
  "Divide into three lanes": "分成三条通道",
  "Divide into two lanes": "分成两条通道",
  "Empty pool/participant": "空泳道",
  "Empty pool/participant (removes content)": "清空泳道（删除内容）",
  "End event": "结束事件",
  "Error boundary event": "错误边界事件",
  "Error end event": "结束错误事件",
  "Error start event": "错误启动事件",
  "Escalation boundary event": "升级边界事件",
  "Escalation boundary event (non-interrupting)": "升级边界事件 (非中断)",
  "Escalation end event": "结束升级事件",
  "Escalation intermediate throw event": "中间升级抛出事件",
  "Escalation start event": "升级启动事件",
  "Escalation start event (non-interrupting)": "升级启动事件 (非中断)",
  "Event sub-process": "事件子流程",
  "Event-based gateway": "事件网关",
  "Exclusive gateway": "独占网关",
  "Inclusive gateway": "包容网关",
  "Intermediate throw event": "中间抛出事件",
  "Link intermediate catch event": "中间链接捕获事件",
  "Link intermediate throw event": "中间链接抛出事件",
  "Loop": "循环",
  "Manual task": "手动任务",
  "Message boundary event": "消息边界事件",
  "Message boundary event (non-interrupting)": "消息边界事件 (非中断)",
  "Message end event": "结束消息事件",
  "Message intermediate catch event": "中间消息捕获事件",
  "Message intermediate throw event": "中间消息抛出事件",
  "Message start event": "消息启动事件",
  "Message start event (non-interrupting)": "消息启动事件 (非中断)",
  "Open {element}": "打开 {element}",
  "Parallel gateway": "并行网关",
  "Parallel multi-instance": "并行多实例",
  "Participant multiplicity": "参与者多重性",
  "Receive task": "接受任务",
  "Remove": "移除",
  "Script task": "脚本任务",
  "Search in diagram": "在图表中搜索",
  "Send task": "发送任务",
  "Sequence flow": "顺序流",
  "Sequential multi-instance": "串行多实例",
  "Service task": "服务任务",
  "Signal boundary event": "信号边界事件",
  "Signal boundary event (non-interrupting)": "信号边界事件 (非中断)",
  "Signal end event": "结束信号事件",
  "Signal intermediate catch event": "中间信号捕获事件",
  "Signal intermediate throw event": "中间信号抛出事件",
  "Signal start event": "信号启动事件",
  "Signal start event (non-interrupting)": "信号启动事件 (非中断)",
  "Start event": "开始事件",
  "Sub-process": "子流程",
  "Sub-process (collapsed)": "可折叠子流程",
  "Sub-process (expanded)": "可展开子流程",
  "Task": "任务",
  "Terminate end event": "终止边界事件",
  "Timer boundary event": "定时边界事件",
  "Timer boundary event (non-interrupting)": "定时边界事件 (非中断)",
  "Timer intermediate catch event": "中间定时捕获事件",
  "Timer start event": "定时启动事件",
  "Timer start event (non-interrupting)": "定时启动事件 (非中断)",
  "Transaction": "事务",
  "User task": "用户任务",
  "already rendered {element}": "{element} 已呈现",
  "correcting missing bpmnElement on {plane} to {rootElement}": "在 {plane} 上更正缺失的 bpmnElement 为 {rootElement}",
  "diagram not part of bpmn:Definitions": "图表不是 bpmn:Definitions 的一部分",
  "element required": "需要元素",
  "element {element} referenced by {referenced}#{property} not yet drawn": "元素 {element} 的引用 {referenced}#{property} 尚未绘制",
  "failed to import {element}": "{element} 导入失败",
  "flow elements must be children of pools/participants": "元素必须是池/参与者的子级",
  "missing {semantic}#attachedToRef": "在 {element} 中缺少 {semantic}#attachedToRef",
  "more than {count} child lanes": "超过 {count} 条通道",
  "multiple DI elements defined for {element}": "为 {element} 定义了多个 DI 元素",
  "no bpmnElement referenced in {element}": "{element} 中没有引用 bpmnElement",
  "no diagram to display": "没有要显示的图表",
  "no parent for {element} in {parent}": "在 {element} 中没有父元素 {parent}",
  "no process or collaboration to display": "没有可显示的流程或协作",
  "no shape type specified": "未指定形状类型",
  "out of bounds release": "越界释放"
          },
          'en': {
            // 英文使用默认翻译，可以根据需要添加自定义的英文翻译
            "Activate create/remove space tool": "Activate create/remove space tool",
  "Activate global connect tool": "Activate global connect tool",
  "Activate hand tool": "Activate hand tool",
  "Activate lasso tool": "Activate lasso tool",
  "Ad-hoc": "Ad-hoc",
  "Ad-hoc sub-process (collapsed)": "Ad-hoc sub-process (collapsed)",
  "Ad-hoc sub-process (expanded)": "Ad-hoc sub-process (expanded)",
  "Add lane above": "Add lane above",
  "Add lane below": "Add lane below",
  "Add text annotation": "Add text annotation",
  "Align elements": "Align elements",
  "Align elements bottom": "Align elements bottom",
  "Align elements center": "Align elements center",
  "Align elements left": "Align elements left",
  "Align elements middle": "Align elements middle",
  "Align elements right": "Align elements right",
  "Align elements top": "Align elements top",
  "Append compensation activity": "Append compensation activity",
  "Append conditional intermediate catch event": "Append conditional intermediate catch event",
  "Append end event": "Append end event",
  "Append gateway": "Append gateway",
  "Append intermediate/boundary event": "Append intermediate/boundary event",
  "Append message intermediate catch event": "Append message intermediate catch event",
  "Append receive task": "Append receive task",
  "Append signal intermediate catch event": "Append signal intermediate catch event",
  "Append task": "Append task",
  "Append text annotation": "Append text annotation",
  "Append timer intermediate catch event": "Append timer intermediate catch event",
  "Business rule task": "Business rule task",
  "Call activity": "Call activity",
  "Cancel boundary event": "Cancel boundary event",
  "Cancel end event": "Cancel end event",
  "Change element": "Change element",
  "Change type": "Change type",
  "Collection": "Collection",
  "Compensation boundary event": "Compensation boundary event",
  "Compensation end event": "Compensation end event",
  "Compensation intermediate throw event": "Compensation intermediate throw event",
  "Compensation start event": "Compensation start event",
  "Complex gateway": "Complex gateway",
  "Conditional boundary event": "Conditional boundary event",
  "Conditional boundary event (non-interrupting)": "Conditional boundary event (non-interrupting)",
  "Conditional flow": "Conditional flow",
  "Conditional intermediate catch event": "Conditional intermediate catch event",
  "Conditional start event": "Conditional start event",
  "Conditional start event (non-interrupting)": "Conditional start event (non-interrupting)",
  "Connect to other element": "Connect to other element",
  "Connect using association": "Connect using association",
  "Connect using data input association": "Connect using data input association",
  "Connect using sequence/message flow or association": "Connect using sequence/message flow or association",
  "Create data object reference": "Create data object reference",
  "Create data store reference": "Create data store reference",
  "Create end event": "Create end event",
  "Create expanded sub-process": "Create expanded sub-process",
  "Create gateway": "Create gateway",
  "Create group": "Create group",
  "Create intermediate/boundary event": "Create intermediate/boundary event",
  "Create pool/participant": "Create pool/participant",
  "Create start event": "Create start event",
  "Create task": "Create task",
  "Data object reference": "Data object reference",
  "Data store reference": "Data store reference",
  "Default flow": "Default flow",
  "Delete": "Delete",
  "Distribute elements horizontally": "Distribute elements horizontally",
  "Distribute elements vertically": "Distribute elements vertically",
  "Divide into three lanes": "Divide into three lanes",
  "Divide into two lanes": "Divide into two lanes",
  "Empty pool/participant": "Empty pool/participant",
  "Empty pool/participant (removes content)": "Empty pool/participant (removes content)",
  "End event": "End event",
  "Error boundary event": "Error boundary event",
  "Error end event": "Error end event",
  "Error start event": "Error start event",
  "Escalation boundary event": "Escalation boundary event",
  "Escalation boundary event (non-interrupting)": "Escalation boundary event (non-interrupting)",
  "Escalation end event": "Escalation end event",
  "Escalation intermediate throw event": "Escalation intermediate throw event",
  "Escalation start event": "Escalation start event",
  "Escalation start event (non-interrupting)": "Escalation start event (non-interrupting)",
  "Event sub-process": "Event sub-process",
  "Event-based gateway": "Event-based gateway",
  "Exclusive gateway": "Exclusive gateway",
  "Inclusive gateway": "Inclusive gateway",
  "Intermediate throw event": "Intermediate throw event",
  "Link intermediate catch event": "Link intermediate catch event",
  "Link intermediate throw event": "Link intermediate throw event",
  "Loop": "Loop",
  "Manual task": "Manual task",
  "Message boundary event": "Message boundary event",
  "Message boundary event (non-interrupting)": "Message boundary event (non-interrupting)",
  "Message end event": "Message end event",
  "Message intermediate catch event": "Message intermediate catch event",
  "Message intermediate throw event": "Message intermediate throw event",
  "Message start event": "Message start event",
  "Message start event (non-interrupting)": "Message start event (non-interrupting)",
  "Open {element}": "Open {element}",
  "Parallel gateway": "Parallel gateway",
  "Parallel multi-instance": "Parallel multi-instance",
  "Participant multiplicity": "Participant multiplicity",
  "Receive task": "Receive task",
  "Remove": "Remove",
  "Script task": "Script task",
  "Search in diagram": "Search in diagram",
  "Send task": "Send task",
  "Sequence flow": "Sequence flow",
  "Sequential multi-instance": "Sequential multi-instance",
  "Service task": "Service task",
  "Signal boundary event": "Signal boundary event",
  "Signal boundary event (non-interrupting)": "Signal boundary event (non-interrupting)",
  "Signal end event": "Signal end event",
  "Signal intermediate catch event": "Signal intermediate catch event",
  "Signal intermediate throw event": "Signal intermediate throw event",
  "Signal start event": "Signal start event",
  "Signal start event (non-interrupting)": "Signal start event (non-interrupting)",
  "Start event": "Start event",
  "Sub-process": "Sub-process",
  "Sub-process (collapsed)": "Sub-process (collapsed)",
  "Sub-process (expanded)": "Sub-process (expanded)",
  "Task": "Task",
  "Terminate end event": "Terminate end event",
  "Timer boundary event": "Timer boundary event",
  "Timer boundary event (non-interrupting)": "Timer boundary event (non-interrupting)",
  "Timer intermediate catch event": "Timer intermediate catch event",
  "Timer start event": "Timer start event",
  "Timer start event (non-interrupting)": "Timer start event (non-interrupting)",
  "Toggle non-interrupting": "Toggle non-interrupting",
  "Transaction": "Transaction",
  "User task": "User task",
  "already rendered {element}": "already rendered {element}",
  "correcting missing bpmnElement on {plane} to {rootElement}": "correcting missing bpmnElement on {plane} to {rootElement}",
  "diagram not part of bpmn:Definitions": "diagram not part of bpmn:Definitions",
  "element required": "element required",
  "element {element} referenced by {referenced}#{property} not yet drawn": "element {element} referenced by {referenced}#{property} not yet drawn",
  "failed to import {element}": "failed to import {element}",
  "flow elements must be children of pools/participants": "flow elements must be children of pools/participants",
  "missing {semantic}#attachedToRef": "missing {semantic}#attachedToRef",
  "more than {count} child lanes": "more than {count} child lanes",
  "multiple DI elements defined for {element}": "multiple DI elements defined for {element}",
  "no bpmnElement referenced in {element}": "no bpmnElement referenced in {element}",
  "no diagram to display": "no diagram to display",
  "no parent for {element} in {parent}": "no parent for {element} in {parent}",
  "no plane for {element}": "no plane for {element}",
  "no process or collaboration to display": "no process or collaboration to display",
  "no shape type specified": "no shape type specified",
  "out of bounds release": "out of bounds release",
  "unknown di {di} for element {semantic}": "unknown di {di} for element {semantic}",
  "unrecognized flowElement {element} in context {context}": "unrecognized flowElement {element} in context {context}",
  "unsupported bpmnElement for {plane}: {rootElement}": "unsupported bpmnElement for {plane}: {rootElement}",
  "{semantic}#{side} Ref not specified": "{semantic}#{side} Ref not specified"
          }
        };
        
        // 修改自定义translate模块的实现方式，确保正确引用外部变量
        const customTranslateModule = {
          translate: ['type', function() {
            // 获取当前语言，使用闭包而不是直接引用可能未初始化的变量
            const getCurrentLocale = () => {
              return currentLocale.value || 'zh';
            };
            
            // 创建translate函数
            function translate(template, replacements) {
              const locale = getCurrentLocale();
              const translations = bpmnTranslations[locale] || {};
              
              // 直接查找完全匹配
              if (translations[template]) {
                return translations[template];
              }
              
              // 如果有replacements，应用它们
              if (replacements) {
                return template.replace(/{([^}]+)}/g, function(_, key) {
                  return replacements[key] || '{' + key + '}';
                });
              }
              
              // 没有找到翻译时返回原文
              return template;
            }
            
            // 添加切换语言方法
            translate.changeLanguage = function(locale) {
              console.log('%c[BPMN翻译]', 'color:blue', `切换语言: ${getCurrentLocale()} -> ${locale}`);
              // 更新外部的currentLocale
              if (currentLocale && typeof currentLocale === 'object' && 'value' in currentLocale) {
                currentLocale.value = locale;
              }
              return locale;
            };
            
            return translate;
          }]
        };
        
        // 添加自定义i18n模块，解决"No provider for i18n"错误
        const customI18nModule = {
          i18n: ['type', function() {
            return {
              _language: currentLocale.value || 'zh',
              
              // 获取当前语言
              getLanguage() {
                return this._language;
              },
              
              // 切换语言方法
              changeLanguage(lang) {
                console.log('%c[BPMN i18n]', 'color:blue', `切换语言: ${this._language} -> ${lang}`);
                this._language = lang;
                
                // 同步更新外部的currentLocale
                if (currentLocale && typeof currentLocale === 'object' && 'value' in currentLocale) {
                  currentLocale.value = lang;
                }
                
                // 返回当前语言
                return lang;
              }
            };
          }]
        };

        // 添加错误处理模块
        const SilentErrorModule = {
          __init__: ['silentError'],
          silentError: ['type', function() {
            return {
              silent: true,
              
              init: function() {
                // 修复ContextPad#getPad方法
                try {
                  setTimeout(() => {
                    const contextPad = bpmnModeler.get('contextPad');
                    if (contextPad && contextPad.getPad) {
                      // 保存原始方法
                      const originalGetPad = contextPad.getPad;
                      
                      // 替换为不产生警告的版本
                      contextPad.getPad = function(element) {
                        const originalWarn = console.warn;
                        console.warn = function() {}; // 临时禁用警告
                        
                        try {
                          const result = originalGetPad.call(this, element);
                          console.warn = originalWarn; // 恢复警告功能
                          return result;
                        } catch (e) {
                          console.warn = originalWarn; // 确保恢复警告功能
                          // 返回一个有效的替代品
                          return { html: document.createElement('div') };
                        }
                      };
                    }
                  }, 200);
                } catch (e) {
                  // 忽略错误
                }
              }
            };
          }]
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
            SilentErrorModule, // 添加错误处理模块
            customTranslateModule, // 添加自定义translate模块，替代官方模块
            customI18nModule, // 添加自定义i18n模块
          ],
          // 设置翻译和语言选项
          translations: bpmnTranslations,
          locale: currentLocale.value // 设置初始语言
        });

        // 覆盖 getPad 方法防止警告
        setTimeout(() => {
          try {
            const contextPad = bpmnModeler.get('contextPad');
            if (contextPad) {
              const originalGetPad = contextPad.getPad;
              contextPad.getPad = function(element) {
                // 暂时禁用console.warn
                const originalWarn = console.warn;
                console.warn = function() {};
                
                try {
                  // 调用原始方法
                  const result = originalGetPad.call(this, element);
                  // 恢复console.warn
                  console.warn = originalWarn;
                  return result;
                } catch (e) {
                  // 恢复console.warn
                  console.warn = originalWarn;
                  // 失败时返回一个最小化替代品
                  return { html: document.createElement('div') };
                }
              };
            }
          } catch (e) {
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
        
        console.log('%c[BPMN导入]', 'color:blue', '开始导入BPMN图表');

        await bpmnModeler.importXML(xml);
        bpmnModeler.get('canvas').zoom('fit-viewport');
        message.success(t('workflow.messages.importSuccess'));
        
        // 导入完成后确保应用当前语言
        console.log('%c[BPMN导入]', 'color:blue', `导入完成，设置语言为：${currentLocale.value}`);
        
        setTimeout(() => {
          try {
            // 尝试使用i18n模块切换语言
            try {
              const i18n = bpmnModeler.get('i18n');
              if (i18n && typeof i18n.changeLanguage === 'function') {
                i18n.changeLanguage(currentLocale.value);
                console.log('%c[BPMN导入]', 'color:green', `通过i18n导入后语言已设置为: ${currentLocale.value}`);
                return; // 成功设置后直接返回
              }
            } catch (err) {
              console.log('%c[BPMN导入]', 'color:orange', '尝试使用i18n模块时出错:', err.message);
            }
            
            // 如果i18n不可用，尝试translate模块
            try {
              const translate = bpmnModeler.get('translate');
              if (translate && typeof translate.changeLanguage === 'function') {
                translate.changeLanguage(currentLocale.value);
                console.log('%c[BPMN导入]', 'color:green', `通过translate导入后语言已设置为: ${currentLocale.value}`);
              } else {
                console.warn('%c[BPMN导入]', 'color:orange', '无法找到可用的语言切换方法');
              }
            } catch (translateErr) {
              console.warn('%c[BPMN导入]', 'color:orange', '尝试使用translate模块时出错:', translateErr.message);
            }
          } catch (e) {
            console.error('%c[BPMN导入]', 'color:red', '导入后设置语言失败:', e);
          }
        }, 200);
      } catch (error) {
        console.error('%c[BPMN导入]', 'color:red', '导入BPMN图表失败', error);
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
      currentLocale, // 暴露给模板
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
</style>

