<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, watch, reactive } from 'vue';

// 导入主题相关
import { usePreferences } from '@vben/preferences';
import { useI18n } from '@vben/locales';

import {
  DownloadOutlined,
  FolderOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';
import { Button, Card, message, Space, Upload, Divider, Select } from 'ant-design-vue';
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
      const result = originalT(key, ...args);
      // 确保返回的是字符串，而不是HTML或React组件等
      return typeof result === 'string' ? result : String(result);
    };
    
    // 当前语言
    const currentLocale = ref('');
    
    // 获取当前语言
    try {
      // 尝试从i18n实例获取当前语言
      if (originalT && originalT.locale) {
        currentLocale.value = originalT.locale.value || '';
      }
    } catch (err) {
      console.error('获取当前语言失败:', err);
    }
    
    // 监听语言变化并更新
    const updateTranslationsForLocale = () => {
      // 重新应用工具提示翻译
      if (bpmnModeler) {
        // 刷新工具栏
        setTimeout(() => {
          // 先处理已经损坏的提示
          cleanupBrokenTooltips();
          
          // 应用工具提示翻译
          applyTooltipTranslations();
          
          // 恢复工具提示
          restoreToolTips();
          
          // 额外处理 - 确保所有BPMN图标都有正确的本地化提示
          try {
            // 映射工具按钮类名到翻译键
            const toolMap = {
              'bpmn-icon-hand-tool': 'workflow.tools.handTool',
              'bpmn-icon-lasso-tool': 'workflow.tools.lassoTool', 
              'bpmn-icon-space-tool': 'workflow.tools.spaceTool',
              'bpmn-icon-connection-multi': 'workflow.tools.connectTool',
              'bpmn-icon-start-event-none': 'workflow.elements.startEvent',
              'bpmn-icon-intermediate-event-none': 'workflow.elements.intermediateEvent',
              'bpmn-icon-end-event-none': 'workflow.elements.endEvent',
              'bpmn-icon-gateway-none': 'workflow.elements.gateway',
              'bpmn-icon-task': 'workflow.elements.task',
              'bpmn-icon-subprocess-expanded': 'workflow.elements.subProcess',
              'bpmn-icon-data-object': 'workflow.elements.dataObject',
              'bpmn-icon-data-store': 'workflow.elements.dataStore',
              'bpmn-icon-participant': 'workflow.elements.participant',
              'bpmn-icon-group': 'workflow.elements.group',
              'bpmn-icon-text-annotation': 'workflow.elements.textAnnotation'
            };
            
            // 直接为所有工具栏图标应用翻译
            document.querySelectorAll('.djs-palette .entry').forEach(el => {
              // 找到匹配的CSS类
              const iconClass = Array.from(el.classList).find(cls => cls.startsWith('bpmn-icon-'));
              if (iconClass && toolMap[iconClass]) {
                // 使用 t 函数翻译文本
                const translationKey = toolMap[iconClass];
                const tooltipText = t(translationKey);
                el.setAttribute('title', tooltipText);
              }
            });
            
            // 清理并翻译所有上下文菜单和工具提示
            document.querySelectorAll('.djs-context-pad .entry, .djs-popup .entry').forEach(entry => {
              // 处理title属性
              const iconClass = Array.from(entry.classList).find(cls => cls.startsWith('bpmn-icon-'));
              if (iconClass && toolMap[iconClass]) {
                const translationKey = toolMap[iconClass];
                const tooltipText = t(translationKey);
                entry.setAttribute('title', tooltipText);
              }
            });
            
            // 刷新UI显示
            if (bpmnModeler) {
              const canvas = bpmnModeler.get('canvas');
              if (canvas) {
                canvas.zoom('fit-viewport');
              }
            }
          } catch (err) {
            console.error('应用语言变化时出错:', err);
          }
        }, 100);
      }
    };
    
    // 只保留一个语言监听，删除其他监听
    watch(
      () => {
        try {
          // 安全地获取语言值
          return originalT?.locale?.value || '';
        } catch (err) {
          console.error('监听语言变化时出错:', err);
          return '';
        }
      },
      (newLocale) => {
        if (newLocale && newLocale !== currentLocale.value) {
          currentLocale.value = newLocale;
          console.log('语言切换到:', newLocale);
          updateTranslationsForLocale();
        }
      },
      { immediate: true }
    );
    
    // 恢复工具提示的简单函数
    const restoreToolTips = () => {
      try {
        // 映射工具按钮类名到翻译键
        const toolMap = {
          // 工具
          'bpmn-icon-hand-tool': 'workflow.tools.handTool',
          'bpmn-icon-lasso-tool': 'workflow.tools.lassoTool', 
          'bpmn-icon-space-tool': 'workflow.tools.spaceTool',
          'bpmn-icon-connection-multi': 'workflow.tools.connectTool',
          
          // 元素
          'bpmn-icon-start-event-none': 'workflow.elements.startEvent',
          'bpmn-icon-intermediate-event-none': 'workflow.elements.intermediateEvent',
          'bpmn-icon-end-event-none': 'workflow.elements.endEvent',
          'bpmn-icon-gateway-none': 'workflow.elements.gateway',
          'bpmn-icon-task': 'workflow.elements.task',
          'bpmn-icon-subprocess-expanded': 'workflow.elements.subProcess',
          'bpmn-icon-data-object': 'workflow.elements.dataObject',
          'bpmn-icon-data-store': 'workflow.elements.dataStore',
          'bpmn-icon-participant': 'workflow.elements.participant',
          'bpmn-icon-group': 'workflow.elements.group',
          'bpmn-icon-text-annotation': 'workflow.elements.textAnnotation'
        };
        
        // 设置工具提示 - 先处理工具栏
        document.querySelectorAll('.djs-palette .entry').forEach(el => {
          // 找到匹配的CSS类
          const iconClass = Array.from(el.classList).find(cls => cls.startsWith('bpmn-icon-'));
          if (iconClass && toolMap[iconClass]) {
            // 使用 t 函数翻译文本
            const translationKey = toolMap[iconClass];
            const tooltipText = t(translationKey);
            el.setAttribute('title', tooltipText);
          }
        });
        
        // 处理上下文菜单项和弹出菜单项
        document.querySelectorAll('.djs-context-pad .entry, .djs-popup .entry').forEach(el => {
          // 处理基于图标类的翻译
          const iconClass = Array.from(el.classList).find(cls => cls.startsWith('bpmn-icon-'));
          if (iconClass && toolMap[iconClass]) {
            const translationKey = toolMap[iconClass];
            const tooltipText = t(translationKey);
            el.setAttribute('title', tooltipText);
          }
          
          // 处理文本内容节点
          const textContent = el.textContent?.trim();
          if (textContent) {
            // 文本节点映射
            const textMap = {
              'Create StartEvent': 'workflow.elements.createStartEvent',
              'Create EndEvent': 'workflow.elements.createEndEvent',
              'Create Gateway': 'workflow.elements.createGateway',
              'Create Task': 'workflow.elements.createTask',
              'Create DataObjectReference': 'workflow.elements.dataObject',
              'Create DataStoreReference': 'workflow.elements.dataStore',
              'Create TextAnnotation': 'workflow.elements.textAnnotation'
            };
            
            if (textMap[textContent]) {
              el.textContent = t(textMap[textContent]);
            }
          }
        });
        
        console.log(`语言: ${currentLocale.value}, 已重新应用工具提示翻译`);
        
        // 触发工具提示翻译
        applyTooltipTranslations();
      } catch (err) {
        console.error('恢复工具提示时出错:', err);
      }
    };
    
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
      }
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
          } catch (err) {
            console.error('访问isDark.value时出错:', err);
            return 'rgba(128, 128, 128, 0.15)'; // 默认使用亮色模式的栅格颜色
          }
        })();

        // 创建或获取栅格层元素
        let gridLayer = canvas.querySelector('.bpmn-grid-layer');
        if (!gridLayer) {
          gridLayer = document.createElement('div');
          gridLayer.className = 'bpmn-grid-layer';
          canvas.appendChild(gridLayer);
          
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
          canvas.removeChild(gridLayer);
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

    // 应用工具提示翻译
    const applyTooltipTranslations = () => {
      // 使用MutationObserver监听工具提示的创建
      if (!canvasRef.value) return;
        
      // 定义翻译映射
      const tooltipTranslations = {
        'Hand Tool': t('workflow.tools.handTool'),
        'Lasso Tool': t('workflow.tools.lassoTool'),
        'Space Tool': t('workflow.tools.spaceTool'),
        'Global Connect Tool': t('workflow.tools.connectTool'),
        'Create Task': t('workflow.elements.task'),
        'Create StartEvent': t('workflow.elements.startEvent'),
        'Create IntermediateEvent': t('workflow.elements.intermediateEvent'),
        'Create EndEvent': t('workflow.elements.endEvent'),
        'Create Gateway': t('workflow.elements.gateway'),
        'Create expanded SubProcess': t('workflow.elements.subProcess'),
        'Create DataObjectReference': t('workflow.elements.dataObject'),
        'Create DataStoreReference': t('workflow.elements.dataStore'),
        'Create Pool/Participant': t('workflow.elements.participant'),
        'Create Group': t('workflow.elements.group'),
        'Create TextAnnotation': t('workflow.elements.textAnnotation'),
        // 添加激活工具的翻译
        'Activate the hand tool': t('workflow.tools.activateHandTool'),
        'Activate the lasso tool': t('workflow.tools.activateLassoTool'),
        'Activate the create/remove space tool': t('workflow.tools.activateSpaceTool'),
        'Activate the global connect tool': t('workflow.tools.activateConnectTool'),
        'Create a task': t('workflow.elements.createTask'),
        'Create a start event': t('workflow.elements.createStartEvent'),
        'Create an intermediate event': t('workflow.elements.createIntermediateEvent'),
        'Create an end event': t('workflow.elements.createEndEvent'),
        'Create a gateway': t('workflow.elements.createGateway'),
        // 添加不带"the"的情况
        'Activate hand tool': t('workflow.tools.activateHandTool'),
        'Activate lasso tool': t('workflow.tools.activateLassoTool'),
        'Activate create/remove space tool': t('workflow.tools.activateSpaceTool'),
        'Activate global connect tool': t('workflow.tools.activateConnectTool'),
        // 添加小写形式
        'create start event': t('workflow.elements.createStartEvent'),
        'create task': t('workflow.elements.createTask'),
        'create intermediate event': t('workflow.elements.createIntermediateEvent'),
        'create end event': t('workflow.elements.createEndEvent'),
        'create gateway': t('workflow.elements.createGateway'),
        'create data object': t('workflow.elements.dataObject'),
        'create data store': t('workflow.elements.dataStore'),
        'create pool/participant': t('workflow.elements.participant'),
        'create group': t('workflow.elements.group'),
        'create text annotation': t('workflow.elements.textAnnotation'),
        // 添加单数形式
        'Start Event': t('workflow.elements.startEventSingle'),
        'Intermediate Event': t('workflow.elements.intermediateEventSingle'),
        'End Event': t('workflow.elements.endEventSingle'),
        'Gateway': t('workflow.elements.gatewaySingle'),
        'Task': t('workflow.elements.taskSingle'),
        'Data Object': t('workflow.elements.dataObjectSingle'),
        'Data Store': t('workflow.elements.dataStoreSingle'),
        'Pool/Participant': t('workflow.elements.participantSingle'),
        'Group': t('workflow.elements.groupSingle'),
        'Text Annotation': t('workflow.elements.textAnnotationSingle')
      };

      // 添加debug函数
      const logTooltipDebug = (type, text, matched) => {
        console.debug(`工具提示[${type}]: '${text}' ${matched ? '已翻译' : '未匹配'}`);
      };
        
      try {
        // 立即检查并翻译工具栏
        const paletteEntriesImmediate = document.querySelectorAll('.djs-palette .entry');
        paletteEntriesImmediate.forEach(entry => {
          const titleText = entry.getAttribute('title')?.trim() || '';
          logTooltipDebug('palette-immediate', titleText, tooltipTranslations[titleText]);
          if (tooltipTranslations[titleText]) {
            entry.setAttribute('title', tooltipTranslations[titleText]);
          }
        });
        
        // 改进：尝试直接查找上下文菜单项并翻译
        const translateContextMenus = () => {
          try {
            // 翻译上下文菜单项
            document.querySelectorAll('.djs-context-pad .entry, .djs-popup .entry').forEach(entry => {
              // 处理title属性
              const titleAttr = entry.getAttribute('title')?.trim();
              if (titleAttr && tooltipTranslations[titleAttr]) {
                entry.setAttribute('title', tooltipTranslations[titleAttr]);
              }
              
              // 处理子元素文本内容
              const textNodes = Array.from(entry.childNodes).filter(node => 
                node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
              
              textNodes.forEach(textNode => {
                const text = textNode.textContent?.trim() || '';
                if (tooltipTranslations[text]) {
                  textNode.textContent = tooltipTranslations[text];
                }
              });
              
              // 处理内部span
              entry.querySelectorAll('span').forEach(span => {
                const spanText = span.textContent?.trim() || '';
                if (tooltipTranslations[spanText]) {
                  span.textContent = tooltipTranslations[spanText];
                }
              });
            });
            
            // 特别针对create start event
            document.querySelectorAll('.djs-popup-body .entry').forEach(entry => {
              // 检查内容节点
              const contentDiv = entry.querySelector('.entry-content');
              if (contentDiv) {
                const contentText = contentDiv.textContent?.trim() || '';
                if (tooltipTranslations[contentText]) {
                  contentDiv.textContent = tooltipTranslations[contentText];
                }
                // 尝试小写匹配
                else if (tooltipTranslations[contentText.toLowerCase()]) {
                  contentDiv.textContent = tooltipTranslations[contentText.toLowerCase()];
                }
              }
              
              // 检查所有文本节点
              const walkTextNodes = (node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                  const text = node.textContent?.trim();
                  if (text && tooltipTranslations[text]) {
                    node.textContent = tooltipTranslations[text];
                  } 
                  // 尝试小写匹配
                  else if (text && tooltipTranslations[text.toLowerCase()]) {
                    node.textContent = tooltipTranslations[text.toLowerCase()];
                  }
                }
                for (const child of node.childNodes) {
                  walkTextNodes(child);
                }
              };
              walkTextNodes(entry);
            });
          } catch (err) {
            console.error('Error translating context menus:', err);
          }
        };
        
        // 首次执行
        translateContextMenus();

        // 监听tooltip容器元素的创建
        const observer = new MutationObserver((mutations) => {
          try {
            mutations.forEach((mutation) => {
              if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                  // 检查是否为工具提示容器
                  if (node.nodeType === 1) {
                    // 检查直接的工具提示容器
                    if (node.classList?.contains('djs-tooltip-container')) {
                      const tooltipText = node.textContent?.trim() || '';
                      logTooltipDebug('tooltip-container', tooltipText, tooltipTranslations[tooltipText]);
                      if (tooltipTranslations[tooltipText]) {
                        node.textContent = tooltipTranslations[tooltipText];
                      }
                    }
                    
                    // 检查所有子元素中的工具提示容器
                    const tooltipElements = node.querySelectorAll?.('.djs-tooltip-container') || [];
                    tooltipElements.forEach(tooltipEl => {
                      const tooltipText = tooltipEl.textContent?.trim() || '';
                      logTooltipDebug('tooltip-container-child', tooltipText, tooltipTranslations[tooltipText]);
                      if (tooltipTranslations[tooltipText]) {
                        tooltipEl.textContent = tooltipTranslations[tooltipText];
                      }
                    });
                    
                    // 处理palette按钮上的title属性
                    const paletteEntries = node.querySelectorAll?.('.djs-palette .entry') || [];
                    paletteEntries.forEach(entry => {
                      const titleText = entry.getAttribute('title')?.trim() || '';
                      logTooltipDebug('palette-entry', titleText, tooltipTranslations[titleText]);
                      if (tooltipTranslations[titleText]) {
                        entry.setAttribute('title', tooltipTranslations[titleText]);
                      }
                    });
                  }
                });
              }
              
              // 检查palette工具和上下文菜单的创建
              if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
                const target = mutation.target;
                if (target.nodeType === 1) {
                  const titleText = target.getAttribute('title')?.trim() || '';
                  logTooltipDebug('title-attr', titleText, tooltipTranslations[titleText]);
                  if (tooltipTranslations[titleText]) {
                    target.setAttribute('title', tooltipTranslations[titleText]);
                  }
                }
              }
            });
          } catch (err) {
            console.error('Error in tooltip translation observer callback:', err);
          }
        });
          
        // 开始监听DOM变化，包括属性变化
        observer.observe(document.body, { 
          childList: true, 
          subtree: true,
          attributes: true,
          attributeFilter: ['title']
        });
        
        // 主动翻译已存在的工具提示
        setTimeout(() => {
          try {
            // 翻译palette工具
            const paletteEntries = document.querySelectorAll('.djs-palette .entry');
            paletteEntries.forEach(entry => {
              const titleText = entry.getAttribute('title')?.trim() || '';
              logTooltipDebug('palette-timeout', titleText, tooltipTranslations[titleText]);
              if (tooltipTranslations[titleText]) {
                entry.setAttribute('title', tooltipTranslations[titleText]);
              }
            });
            
            // 翻译已存在的工具提示容器
            const tooltipContainers = document.querySelectorAll('.djs-tooltip-container');
            tooltipContainers.forEach(container => {
              const tooltipText = container.textContent?.trim() || '';
              logTooltipDebug('tooltip-timeout', tooltipText, tooltipTranslations[tooltipText]);
              if (tooltipTranslations[tooltipText]) {
                container.textContent = tooltipTranslations[tooltipText];
              }
            });

            // 更彻底地查找所有可能的tooltip元素
            document.querySelectorAll('[title]').forEach(el => {
              const titleText = el.getAttribute('title')?.trim() || '';
              logTooltipDebug('any-title-attr', titleText, tooltipTranslations[titleText]);
              if (tooltipTranslations[titleText]) {
                el.setAttribute('title', tooltipTranslations[titleText]);
              }
            });
            
            // 翻译上下文菜单
            translateContextMenus();
          } catch (err) {
            console.error('Error translating existing tooltips:', err);
          }
        }, 500);
        
        // 定期检查并翻译
        const intervalId = setInterval(() => {
          try {
            // 更彻底地查找所有可能的title属性
            document.querySelectorAll('[title]').forEach(el => {
              const titleText = el.getAttribute('title')?.trim() || '';
              if (tooltipTranslations[titleText]) {
                el.setAttribute('title', tooltipTranslations[titleText]);
              }
            });
            
            // 定期翻译上下文菜单
            translateContextMenus();
          } catch (err) {
            console.error('Error in interval translation:', err);
          }
        }, 1000); // 缩短间隔时间以提高响应性
        
        // 保存观察者引用，以便在组件卸载时断开连接
        tooltipObserver.value = {
          disconnect: () => {
            observer.disconnect();
            clearInterval(intervalId);
          }
        };
      } catch (err) {
        console.error('Error setting up tooltip translation observer:', err);
      }
    };

    // 存储MutationObserver引用
    const tooltipObserver = ref(null);
    
    // 初始化BPMN建模器
    const initBpmnModeler = () => {
      if (bpmnModeler) return;

      // 创建一个拦截翻译的模块
      const TranslateModule = {
        translate: ['value', function(defaultTranslate) {
          // 自定义翻译函数
          return function(template, replacements) {
            // 确保template是字符串
            if (!template || typeof template !== 'string') {
              return defaultTranslate(template, replacements);
            }
            
            // 更全面的翻译映射
            const translationMap = {
              // 元素名称
              'Start Event': t('workflow.elements.startEventSingle'),
              'Intermediate Event': t('workflow.elements.intermediateEventSingle'),
              'End Event': t('workflow.elements.endEventSingle'),
              'Gateway': t('workflow.elements.gatewaySingle'),
              'Task': t('workflow.elements.taskSingle'),
              'Data Object': t('workflow.elements.dataObjectSingle'),
              'Data Store': t('workflow.elements.dataStoreSingle'),
              'Pool/Participant': t('workflow.elements.participantSingle'),
              'Group': t('workflow.elements.groupSingle'),
              'Text Annotation': t('workflow.elements.textAnnotationSingle'),
              'Subprocess (expanded)': t('workflow.elements.subProcessSingle'),
              
              // 创建元素命令
              'Create StartEvent': t('workflow.elements.startEvent'),
              'Create IntermediateEvent': t('workflow.elements.intermediateEvent'),
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
              'create intermediate event': t('workflow.elements.createIntermediateEvent'),
              'create end event': t('workflow.elements.createEndEvent'),
              'create gateway': t('workflow.elements.createGateway'),
              'create task': t('workflow.elements.createTask'),
              'create data object': t('workflow.elements.dataObject'),
              'create data store': t('workflow.elements.dataStore'),
              'create pool/participant': t('workflow.elements.participant'),
              'create group': t('workflow.elements.group'),
              'create text annotation': t('workflow.elements.textAnnotation'),
              'create subprocess (expanded)': t('workflow.elements.subProcess'),
              
              // 不同的形式
              'Create a task': t('workflow.elements.createTask'),
              'Create a start event': t('workflow.elements.createStartEvent'),
              'Create an intermediate event': t('workflow.elements.createIntermediateEvent'),
              'Create an end event': t('workflow.elements.createEndEvent'),
              'Create a gateway': t('workflow.elements.createGateway'),
              'Create a data object': t('workflow.elements.dataObject'),
              'Create a data store': t('workflow.elements.dataStore'),
              'Create a pool/participant': t('workflow.elements.participant'),
              'Create a group': t('workflow.elements.group'),
              'Create a text annotation': t('workflow.elements.textAnnotation'),
              'Create a subprocess (expanded)': t('workflow.elements.subProcess'),
              
              // 工具提示
              'Hand Tool': t('workflow.tools.handTool'),
              'Lasso Tool': t('workflow.tools.lassoTool'),
              'Space Tool': t('workflow.tools.spaceTool'),
              'Global Connect Tool': t('workflow.tools.connectTool'),
              
              // 工具激活提示
              'Activate the hand tool': t('workflow.tools.activateHandTool'),
              'Activate the lasso tool': t('workflow.tools.activateLassoTool'),
              'Activate the create/remove space tool': t('workflow.tools.activateSpaceTool'),
              'Activate the global connect tool': t('workflow.tools.activateConnectTool'),
              
              // 不带"the"的版本
              'Activate hand tool': t('workflow.tools.activateHandTool'),
              'Activate lasso tool': t('workflow.tools.activateLassoTool'),
              'Activate create/remove space tool': t('workflow.tools.activateSpaceTool'),
              'Activate global connect tool': t('workflow.tools.activateConnectTool'),
              
              // 特殊处理Start Event
              'Create Start Event': t('workflow.elements.createStartEvent')
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
            
            // 如果没有特定翻译，调用默认翻译函数
            return defaultTranslate(template, replacements);
          };
        }]
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
            TranslateModule // 添加我们的翻译模块
          ],
        });

        // 导入初始图表
        importBpmnDiagram(INITIAL_XML);

        // 应用当前主题样式
        applyThemeStyles();
      } catch (err) {
        console.error('初始化BPMN建模器失败:', err);
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
        
        // 应用国际化工具提示
        applyTooltipTranslations();
      },
      { immediate: true }
    );

    // 组件挂载时初始化BPMN建模器
    onMounted(() => {
      initBpmnModeler();
      
      // 延迟应用栅格样式，确保DOM完全渲染
      setTimeout(() => {
        applyGridStyles();
        applyTooltipTranslations();
        
        // 修复可能出现的工具提示问题
        cleanupBrokenTooltips();
        // 恢复工具提示
        restoreToolTips();
        
        // 强制触发一次完整的语言翻译更新
        updateTranslationsForLocale();
      }, 100);
      
      // 5秒后再次检查工具提示，确保所有动态创建的元素都被翻译
      setTimeout(() => {
        console.log('执行延迟工具提示检查...');
        updateTranslationsForLocale();
      }, 5000);
    });

    // 清理可能损坏的工具提示
    const cleanupBrokenTooltips = () => {
      try {
        // 查找所有工具提示相关元素
        document.querySelectorAll('[title], .djs-tooltip-container, .djs-palette .entry').forEach(el => {
          const title = el.getAttribute('title');
          if (title && (title.includes('<') || title.includes('{'))) {
            // 移除可能包含HTML或对象字符串的title
            el.removeAttribute('title');
            
            // 如果是工具栏按钮，尝试设置更简单的title
            if (el.classList.contains('entry')) {
              if (el.classList.contains('bpmn-icon-hand-tool')) {
                el.setAttribute('title', t('workflow.tools.handTool'));
              } else if (el.classList.contains('bpmn-icon-lasso-tool')) {
                el.setAttribute('title', t('workflow.tools.lassoTool'));
              } else if (el.classList.contains('bpmn-icon-space-tool')) {
                el.setAttribute('title', t('workflow.tools.spaceTool'));
              } else if (el.classList.contains('bpmn-icon-connection-multi')) {
                el.setAttribute('title', t('workflow.tools.connectTool'));
              } else if (el.classList.contains('bpmn-icon-start-event-none')) {
                el.setAttribute('title', t('workflow.elements.createStartEvent'));
              } else if (el.classList.contains('bpmn-icon-end-event-none')) {
                el.setAttribute('title', t('workflow.elements.createEndEvent'));
              } else if (el.classList.contains('bpmn-icon-gateway-none')) {
                el.setAttribute('title', t('workflow.elements.createGateway'));
              } else if (el.classList.contains('bpmn-icon-task')) {
                el.setAttribute('title', t('workflow.elements.createTask'));
              } else if (el.classList.contains('bpmn-icon-participant')) {
                el.setAttribute('title', t('workflow.elements.participant'));
              } else if (el.classList.contains('bpmn-icon-group')) {
                el.setAttribute('title', t('workflow.elements.group'));
              } else if (el.classList.contains('bpmn-icon-subprocess-expanded')) {
                el.setAttribute('title', t('workflow.elements.subProcess'));
              } else if (el.classList.contains('bpmn-icon-data-object')) {
                el.setAttribute('title', t('workflow.elements.dataObject'));
              } else if (el.classList.contains('bpmn-icon-data-store')) {
                el.setAttribute('title', t('workflow.elements.dataStore'));
              } else if (el.classList.contains('bpmn-icon-text-annotation')) {
                el.setAttribute('title', t('workflow.elements.textAnnotation'));
              }
            }
          }
        });
        
        // 检查显示的工具提示容器
        document.querySelectorAll('.djs-tooltip-container').forEach(el => {
          if (el.textContent && (el.textContent.includes('<') || el.textContent.includes('{'))) {
            el.style.display = 'none'; // 隐藏损坏的工具提示
          }
        });
      } catch (err) {
        console.error('Error cleaning up broken tooltips:', err);
      }
    };

    // 组件卸载时销毁BPMN建模器
    onUnmounted(() => {
      // 断开MutationObserver连接
      if (tooltipObserver.value) {
        tooltipObserver.value.disconnect();
        tooltipObserver.value = null;
      }
      
      if (bpmnModeler) {
        bpmnModeler.destroy();
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
        } catch (err) {
          console.error('应用主题时出错:', err);
        }
        
        // 导入XML并正确处理Promise
        try {
          const { warnings } = await bpmnModeler.importXML(diagram);
          if (warnings && warnings.length) {
            console.warn('导入图表时有警告:', warnings);
          }
        } catch (err) {
          console.error('导入XML时出错:', err);
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
          {{ gridConfig.enabled ? t('workflow.actions.hideGrid') : t('workflow.actions.showGrid') }}
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
