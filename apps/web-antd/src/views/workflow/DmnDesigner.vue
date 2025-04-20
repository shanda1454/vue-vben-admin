// @ts-nocheck /* eslint-disable */
<script lang="ts">
// DMN 中文翻译
import { dmnTranslations } from '#/locales/lang/zh-CN/dmnTranslations';

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
  Tabs,
  Upload,
} from 'ant-design-vue';

// 导入DMN模块化类
import DmnModeler from 'dmn-js/lib/Modeler';

// 导入属性面板
import {
  DmnPropertiesPanelModule,
  DmnPropertiesProviderModule
} from 'dmn-js-properties-panel';

// 导入Ant Design国际化 - 作为唯一的语言源
import { antdLocale } from '#/locales';

// 导入样式
import './dmn-theme.less';

// 第三方依赖
import 'dmn-js/dist/assets/diagram-js.css';
import 'dmn-js/dist/assets/dmn-js-shared.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

// 添加全局错误处理以消除特定警告
(function () {
  // 替换 console.warn 来屏蔽特定警告
  const originalWarn = console.warn;
  console.warn = function (...args) {
    // 检查是否是关于不常见的警告
    if (
      args.length > 0 &&
      typeof args[0] === 'string' &&
      (args[0].includes('deprecated') || args[0].includes('Warning'))
    ) {
      return; // 忽略此警告
    }
    return originalWarn.apply(console, args);
  };
})();

// 基础类型声明
interface DmnTranslations {
  [locale: string]: {
    [key: string]: string;
  };
}

export default defineComponent({
  name: 'DmnDesigner',
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
    ATabs: Tabs,
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
      // 安全获取locale值
      let localeValue = null;
      
      // @ts-ignore - 访问动态属性，类型可能不一致
      if (antdLocale?.value?.locale) {
        // @ts-ignore - 访问动态属性
        localeValue = antdLocale.value.locale;
      }
      
      // 打印初始语言值用于调试  
      console.warn('[DMN语言] 初始化语言检测:', localeValue);
      
      // 安全地判断是否为英文
      const isLocaleEn = localeValue === 'en' || localeValue === 'en_US' || localeValue === 'en-US';
      currentLocale.value = isLocaleEn ? 'en' : 'zh';
      
      console.warn('[DMN语言] 初始语言设置为:', currentLocale.value);
    } catch (error) {
      console.error('获取初始语言失败:', error);
    }

    // 引用DOM元素
    const containerRef = ref();
    const canvasRef = ref();
    const panelRef = ref();
    const uploadRef = ref();

    // 获取主题信息
    const { isDark } = usePreferences();

    // 栅格配置
    const gridConfig = reactive({
      enabled: true,
      size: 40,
    });

    // 当前活动视图索引
    const activeViewIndex = ref(0);

    // DMN设计器实例
    let dmnModeler: DmnModeler | null = null;

    // 初始DMN XML
    const INITIAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" xmlns:camunda="http://camunda.org/schema/1.0/dmn" id="Definitions_0ywlmew" name="DRD" namespace="http://camunda.org/schema/1.0/dmn" exporter="Camunda Modeler" exporterVersion="4.8.0">
  <decision id="Decision_0r0k2kn" name="Decision 1">
    <decisionTable id="DecisionTable_1t2a81s">
      <input id="Input_1">
        <inputExpression id="InputExpression_1" typeRef="string">
          <text></text>
        </inputExpression>
      </input>
      <output id="Output_1" typeRef="string" />
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram>
      <dmndi:DMNShape dmnElementRef="Decision_0r0k2kn">
        <dc:Bounds height="80" width="180" x="160" y="100" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`;

    // 应用主题样式
    const applyThemeStyles = () => {
      if (!containerRef.value) return;

      const container = containerRef.value;

      // 应用暗色主题或亮色主题样式
      if (isDark?.value) {
        container.classList.add('dmn-dark-theme');
      } else {
        container.classList.remove('dmn-dark-theme');
      }

      // 应用栅格样式
      applyGridStyles();
    };

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
        let gridLayer = canvas.querySelector('.dmn-grid-layer');
        if (!gridLayer) {
          gridLayer = document.createElement('div');
          gridLayer.className = 'dmn-grid-layer';
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
        const gridLayer = canvas.querySelector('.dmn-grid-layer');
        if (gridLayer) {
          gridLayer.remove();
        }
      }
    };

    // 切换栅格显示
    const toggleGrid = () => {
      gridConfig.enabled = !gridConfig.enabled;
    };

    // 调整栅格大小
    const adjustGridSize = (size: number) => {
      gridConfig.size = size;
    };

    // 监听antdLocale变化自动更新DMN设计器语言
    watch(
      antdLocale,
      (newLocale) => {
        try {
          if (!newLocale) return;
          
          // 打印完整的newLocale对象用于调试
          console.warn('[DMN语言] antdLocale变化');
          
          // 安全获取locale值
          let localeValue = null;
          
          // @ts-ignore - 访问动态属性，类型可能不一致
          if (newLocale?.locale) {
            // @ts-ignore - 访问动态属性
            localeValue = newLocale.locale;
          } else if (newLocale?.value?.locale) {
            // @ts-ignore - 访问动态属性
            localeValue = newLocale.value.locale;
          }
            
          console.warn('[DMN语言] 提取到的locale值:', localeValue);
          
          // 安全地获取语言值
          const isNewLocaleEn = localeValue === 'en' || localeValue === 'en_US' || localeValue === 'en-US';

          // 映射到DMN支持的格式
          const dmnLocale = isNewLocaleEn ? 'en' : 'zh';
          
          console.warn('[DMN语言] 映射到DMN语言:', dmnLocale);

          // 如果语言确实发生变化，才执行更新
          if (dmnLocale !== currentLocale.value) {
            currentLocale.value = dmnLocale;
            console.warn('[DMN语言] 切换DMN语言为:', currentLocale.value);
            
            // 获取当前活动的视图
            const activeView = dmnModeler?.getActiveViewer();
            
            // 修复: 使用getActiveViewer()获取i18n服务而不是直接从modeler获取
            if (activeView) {
              try {
                // 正确获取i18n服务的方式是从活动视图中获取
                const i18n = activeView.get('i18n');
                if (i18n && typeof i18n.changeLanguage === 'function') {
                  i18n.changeLanguage(currentLocale.value);
                  
                  // 刷新视图
                  if (activeView.type && dmnModeler) {
                    dmnModeler.open(activeView.type);
                  }
                }
              } catch (error) {
                console.error('访问i18n服务失败:', error);
              }
            }
          }
        } catch (error) {
          console.error(`语言切换出错: ${error}`);
          
          // 尝试重新初始化
          try {
            if (dmnModeler) {
              dmnModeler.saveXML({ format: true }).then(({ xml }) => {
                dmnModeler!.destroy();
                dmnModeler = null;
                setTimeout(() => {
                  initDmnModeler();
                  importDmnDiagram(xml);
                }, 100);
              });
            }
          } catch (e) {
            console.error('重新初始化失败:', e);
          }
        }
      },
      {
        immediate: true,
      },
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
        
        // 初始化DMN建模器
        initDmnModeler();

        // 应用主题样式
        applyThemeStyles();
      } catch (error) {
        console.error('组件挂载过程中出错:', error);
      }
    });

    // 初始化DMN建模器
    const initDmnModeler = () => {
      if (dmnModeler) return;

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
                  (dmnTranslations as DmnTranslations)[locale] || {};

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
                  '[DMN翻译] 切换语言:',
                  getCurrentLocale(),
                  '->',
                  locale,
                );
                // 更新外部的currentLocale
                if (
                  currentLocale.value !== null &&
                  currentLocale.value !== undefined
                ) {
                  // 简化判断，直接更新语言值
                  currentLocale.value = locale;
                  console.warn('[DMN翻译] currentLocale已更新:', currentLocale.value);
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
                    '[DMN i18n] 切换语言:',
                    this._language,
                    '->',
                    lang,
                  );
                  this._language = lang;

                  // 同步更新外部的currentLocale
                  if (
                    currentLocale.value !== null &&
                    currentLocale.value !== undefined
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
                  // 错误处理逻辑
                }
              };
            },
          ],
        };

        // 初始化DMN建模器
        dmnModeler = new DmnModeler({
          container: canvasRef.value,
          drd: {
            propertiesPanel: {
              parent: panelRef.value
            },
            additionalModules: [
              DmnPropertiesPanelModule,
              DmnPropertiesProviderModule,
              SilentErrorModule,
              customTranslateModule, 
              customI18nModule
            ]
          },
          decisionTable: {
            additionalModules: [
              customTranslateModule, 
              customI18nModule
            ]
          },
          literalExpression: {
            additionalModules: [
              customTranslateModule, 
              customI18nModule
            ]
          },
          // DMN特有设置
          height: 'calc(100vh - 230px)',
          keyboard: {
            bindTo: document
          }
        });

        // 注册视图切换事件，更新活动视图索引
        dmnModeler.on('views.changed', (event: any) => {
          const { activeView } = event;
          if (activeView && dmnModeler) {
            const views = dmnModeler.getViews();
            for (let i = 0; i < views.length; i++) {
              if (views[i].id === activeView.id) {
                activeViewIndex.value = i;
                break;
              }
            }
          }
        });

        // 导入初始图表
        importDmnDiagram(INITIAL_XML);
      } catch (error) {
        console.error('初始化DMN建模器失败:', error);
        message.error('初始化决策设计器失败');
      }
    };

    // 监听主题变化
    watch(
      () => isDark.value,
      (newIsDark) => {
        // 应用主题样式包括栅格
        applyThemeStyles();
        
        // 如果DMN模块已初始化，则触发主题变更事件
          if (dmnModeler) {
            try {
              const eventBus = dmnModeler.getActiveViewer()?.get('eventBus');
              if (eventBus) {
                eventBus.fire('theme.changed', { 
                  isDark: newIsDark 
                });
              }
            } catch (error) {
              console.error('触发DMN主题变更事件失败:', error);
            }
          }
        
      },
      { immediate: true },
    );

    // 组件卸载时销毁
    onUnmounted(() => {
      try {
        // 销毁DMN建模器
        if (dmnModeler) {
          dmnModeler.destroy();
          dmnModeler = null;
        }
      } catch (error) {
        console.error('[DMN] 销毁DMN建模器出错:', error);
      }
    });

    // 导入DMN图表
    const importDmnDiagram = async (xml: string) => {
      try {
        if (!dmnModeler) return;

        console.warn('[DMN导入] 开始导入DMN图表');

        await dmnModeler.importXML(xml);
        message.success(t('dmn.messages.importSuccess'));

        // 导入完成后确保应用当前语言
        console.warn('[DMN导入] 导入完成，设置语言为：', currentLocale.value);

        // 获取DMN视图
        const views = dmnModeler.getViews();
        if (views && views.length > 0) {
          // 打开第一个视图（通常是DRD）
          dmnModeler.open(views[0]);
        }
      } catch (error) {
        console.error('[DMN导入] 导入DMN图表失败', error);
        message.error(t('dmn.messages.importFailed'));
      }
    };

    // 打开指定视图
    const openView = (idx: number) => {
      if (!dmnModeler) return;
      
      try {
        dmnModeler.open(idx);
        activeViewIndex.value = idx;
      } catch (error) {
        console.error('打开视图失败:', error);
      }
    };

    // 保存决策
    const saveProcess = async () => {
      try {
        if (!dmnModeler) return;

        const { xml } = await dmnModeler.saveXML({ format: true });
        console.warn('保存的XML', xml);
        // 这里可以添加将XML发送到后端的逻辑
        message.success(t('dmn.messages.saveSuccess'));
      } catch (error) {
        console.error('保存决策失败', error);
        message.error(t('dmn.messages.saveFailed'));
      }
    };

    // 下载XML
    const downloadXml = async () => {
      try {
        if (!dmnModeler) return;

        const { xml } = await dmnModeler.saveXML({ format: true });
        const blob = new Blob([xml], { type: 'application/xml' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `decision_${Date.now()}.dmn`;
        document.body.append(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error('下载XML失败', error);
        message.error(t('dmn.messages.exportFailed'));
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
        importDmnDiagram(xml);
      } catch (error: any) {
        console.error('读取文件失败:', error);
        message.error(t('dmn.messages.importFailed'));
      }
      return false;
    };

    return {
      containerRef,
      canvasRef,
      panelRef,
      uploadRef,
      saveProcess,
      downloadXml,
      importXml,
      handleBeforeUpload,
      isDark,
      t,
      currentLocale,
      activeViewIndex,
      openView,
      dmnModeler,
      gridConfig,
      toggleGrid,
      adjustGridSize
    };
  },
});
</script>

<template>
  <div class="dmn-designer-container" ref="containerRef">
    <ACard :bordered="false" title="" :bodyStyle="{ padding: '12px 16px' }" class="toolbar-card">
      <ASpace wrap>
        <AButton type="primary" @click="saveProcess">
          <template #icon>
            <SaveOutlined />
          </template>
          {{ t('dmn.actions.save') }}
        </AButton>
        <AButton @click="downloadXml">
          <template #icon>
            <DownloadOutlined />
          </template>
          {{ t('dmn.actions.download') }}
        </AButton>
        <AUpload ref="uploadRef" :show-upload-list="false" accept=".dmn, .xml" :before-upload="handleBeforeUpload"
          :multiple="false">
          <AButton>
            <template #icon>
              <UploadOutlined />
            </template>
            {{ t('dmn.actions.import') }}
          </AButton>
        </AUpload>
        <ADivider type="vertical" />
        <AButton :type="gridConfig.enabled ? 'primary' : 'default'" @click="toggleGrid">
          {{
            gridConfig.enabled
              ? t('dmn.actions.hideGrid')
              : t('dmn.actions.showGrid')
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

    <div class="dmn-tabs">
      <div 
        v-for="(view, idx) in (dmnModeler as any)?.getViews() || []" 
        :key="idx"
        class="dmn-tab" 
        :class="{ active: activeViewIndex === idx }"
        @click="openView(idx)"
      >
        {{ view.type === 'drd' ? t('dmn.editor.drd') : 
           view.type === 'decisionTable' ? t('dmn.editor.decisionTable') : 
           t('dmn.editor.literalExpression') }}
      </div>
    </div>

    <div class="dmn-content-wrapper">
      <div class="dmn-content">
        <div class="dmn-drd-container" :class="{ 'dmn-dark-theme': isDark }">
          <div ref="canvasRef" class="dmn-js-container"></div>
        </div>
        <div class="dmn-properties-panel-container" :class="{ 'dmn-dark-theme': isDark }">
          <div ref="panelRef" class="dmn-properties-panel"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.dmn-designer-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
  padding: 16px;
  
  .toolbar-card {
    margin-bottom: 0;
    border-bottom: none;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    z-index: 2;
    box-shadow: 0 2px 5px -2px rgba(0, 0, 0, 0.08);
  }

  .dmn-content-wrapper {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: calc(100vh - 230px);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    margin-top: -1px;
  }

  .dmn-content {
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

    .dmn-drd-container {
      flex: 1;
      height: 100%;
      position: relative;
      overflow: hidden;
      
      .dmn-js-container {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
    }

    .dmn-properties-panel-container {
      width: 320px;
      height: 100%;
      overflow: hidden;
      border-left: 1px solid hsl(var(--border));
      background-color: hsl(var(--card));
      display: flex;
      flex-direction: column;
      
      .dmn-properties-panel {
        width: 100%;
        height: calc(100%);
        overflow: auto;
        padding: 0;
        margin: 0;
        position: relative;
        
        /* 确保滚动行为平滑 */
        scroll-behavior: smooth;
        
        /* 提高与面板的对比度 */
        &:focus {
          outline: none;
        }
      }
    }
  }
}

.dmn-tabs {
  background-color: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
  padding: 0 16px;
  display: flex;
  
  .dmn-tab {
    padding: 8px 16px;
    cursor: pointer;
    display: inline-block;
    font-weight: 500;
    
    &.active {
      color: hsl(var(--primary));
      border-bottom: 2px solid hsl(var(--primary));
    }
    
    &:hover:not(.active) {
      color: hsla(var(--primary) / 0.8);
    }
  }
}

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

// 去掉DMN的自带logo
:deep(.djs-minimap) {
  .bjs-powered-by {
    display: none !important;
  }
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

// 常用样式覆盖 - 亮色主题下的属性面板
:deep(.bio-properties-panel) {
  background-color: hsl(var(--card)) !important;
  color: hsl(var(--card-foreground)) !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji' !important;
  
  // 改善滚动条
  scrollbar-width: thin;
  scrollbar-color: hsla(var(--muted-foreground) / 0.3) transparent;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: hsla(var(--muted-foreground) / 0.3);
    border-radius: 4px;
    
    &:hover {
      background-color: hsla(var(--muted-foreground) / 0.5);
    }
  }
}

:deep(.bio-properties-panel-header) {
  background-color: hsl(var(--secondary)) !important;
  color: hsl(var(--secondary-foreground)) !important;
  border-bottom: 1px solid hsl(var(--border)) !important;
  padding: 8px 15px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  position: sticky;
  top: 0;
  z-index: 10;
}

:deep(.bio-properties-panel-group-header) {
  padding: 8px 12px !important;
  font-size: 13px !important;
  background-color: hsl(var(--accent)) !important;
  color: hsl(var(--accent-foreground)) !important;
  border-bottom: 1px solid hsl(var(--border)) !important;
  font-weight: 600;
  display: flex;
  align-items: center;
  
  .bio-properties-panel-dot {
    background-color: hsl(var(--primary)) !important;
    margin-right: 6px;
  }
  
  .bio-properties-panel-arrow-right,
  .bio-properties-panel-add-entry,
  .bio-properties-panel-collapsible-entry-arrow {
    fill: hsl(var(--primary)) !important;
  }
  
  &:hover {
    background-color: hsl(var(--accent-hover)) !important;
  }
}

:deep(.bio-properties-panel-group) {
  background-color: hsl(var(--card)) !important;
  color: hsl(var(--card-foreground)) !important;
  border-bottom: 1px solid hsl(var(--border)) !important;
  
  /* 增强分组层次感 */
  padding-left: 0 !important;  
  padding-right: 0 !important;
  
  /* 表单元素样式 */
  input, textarea, select {
    background-color: hsl(var(--input-background)) !important;
    color: hsl(var(--input-foreground)) !important;
    border: 1px solid hsl(var(--input)) !important;
    border-radius: 4px;
    font-size: 13px !important;
    width: 100%;
    padding: 6px 8px;
    
    &:focus {
      border-color: hsl(var(--primary)) !important;
      outline: none;
      box-shadow: 0 0 0 2px hsla(var(--primary) / 0.3) !important;
    }
    
    &:hover:not(:focus) {
      border-color: hsl(var(--input-hover)) !important;
    }
  }
  
  /* 按钮样式 */
  button {
    background-color: hsl(var(--secondary)) !important;
    color: hsl(var(--secondary-foreground)) !important;
    border: 1px solid transparent !important;
    border-radius: 4px;
    padding: 4px 8px;
    
    &:hover {
      background-color: hsl(var(--secondary-hover)) !important;
    }
    
    &:active {
      background-color: hsl(var(--secondary-active)) !important;
    }
  }
  
  .bio-properties-panel-entry {
    margin: 8px 0 !important;
    font-size: 13px !important;
    border-bottom: 1px solid hsla(var(--border) / 0.2) !important;
    padding: 6px 12px !important;
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  /* 可折叠项 */
  .bio-properties-panel-collapsible-entry {
    background-color: hsla(var(--muted) / 0.1) !important;
    border-radius: 4px;
    margin: 8px 12px !important;
    border: 1px solid hsla(var(--border) / 0.3) !important;
    
    .bio-properties-panel-collapsible-entry-header {
      padding: 8px 10px;
      border-bottom: 1px solid hsla(var(--border) / 0.2) !important;
      font-weight: 500;
      
      &:hover {
        background-color: hsla(var(--muted) / 0.2) !important;
      }
    }
    
    .bio-properties-panel-collapsible-entry-content {
      padding: 8px 12px 8px 20px;
      background-color: hsla(var(--background) / 0.4) !important;
      
      /* 嵌套内容增加缩进 */
      .bio-properties-panel-entry {
        padding-left: 8px !important;
        border-left: 2px solid hsla(var(--border) / 0.3) !important;
        margin-left: 4px !important;
      }
    }
  }
  
  /* 标签和描述 */
  label {
    color: hsl(var(--foreground)) !important;
    font-weight: 500;
    margin-bottom: 4px;
    display: block;
  }
  
  .bio-properties-panel-description {
    color: hsla(var(--muted-foreground) / 0.9) !important;
    font-size: 0.9em;
    margin-top: 4px;
    margin-bottom: 8px;
    padding-left: 2px;
  }
}

:deep(.bio-properties-panel-header-icon) {
  color: hsl(var(--primary)) !important;
  fill: hsl(var(--primary)) !important;
}

:deep(.bio-properties-panel-add-entry) {
  fill: hsl(var(--primary)) !important;
  
  &:hover {
    fill: hsl(var(--primary-foreground)) !important;
    background-color: hsla(var(--primary) / 0.2) !important;
    border-radius: 50%;
  }
}

/* 活动/选中项视觉指示 */
:deep(.bio-properties-panel-active) {
  background-color: hsla(var(--primary) / 0.1) !important;
  border-left: 3px solid hsl(var(--primary)) !important;
}

/* DMN决策表自定义样式 */
:deep(.dmn-decision-table-container) {
  table.dmn-decision-table {
    th, td {
      font-size: 13px !important;
    }
  }
}

/* 暗色主题属性面板样式 */
.dmn-dark-theme {
  /* 属性面板暗色主题样式 */
  :deep(.bio-properties-panel) {
    background-color: hsl(var(--background-deep)) !important;
    color: hsl(var(--foreground)) !important;
    
    // 改善滚动条
    scrollbar-color: hsla(var(--muted-foreground) / 0.5) transparent;
    
    &::-webkit-scrollbar-thumb {
      background-color: hsla(var(--muted-foreground) / 0.5);
      
      &:hover {
        background-color: hsla(var(--muted-foreground) / 0.8);
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
    
    /* 表单元素样式 */
    input, textarea, select {
      background-color: hsla(var(--muted) / 0.7) !important;
      color: #ffffff !important;
      border: 1px solid hsla(var(--border) / 0.8) !important;
      
      &:focus {
        border-color: hsl(var(--primary)) !important;
        box-shadow: 0 0 0 2px hsla(var(--primary) / 0.3) !important;
      }
      
      &:hover:not(:focus) {
        border-color: hsla(var(--border)) !important;
      }
    }
    
    /* 按钮样式 */
    button {
      background-color: hsla(var(--secondary) / 0.8) !important;
      color: #ffffff !important;
      
      &:hover {
        background-color: hsl(var(--secondary)) !important;
      }
    }
    
    /* 标签和描述 */
    label {
      color: hsl(var(--foreground)) !important;
    }
    
    .bio-properties-panel-description {
      color: hsla(var(--muted-foreground) / 0.9) !important;
    }
    
    /* 增强条目样式 */
    .bio-properties-panel-entry {
      border-bottom: 1px solid hsla(var(--border) / 0.15) !important;
      
      &:hover {
        background-color: hsla(var(--muted) / 0.15) !important;
      }
    }
    
    /* 可折叠项样式增强 */
    .bio-properties-panel-collapsible-entry {
      background-color: hsla(var(--muted) / 0.25) !important;
      border: 1px solid hsla(var(--border) / 0.4) !important;
      
      .bio-properties-panel-collapsible-entry-header {
        background-color: hsla(var(--card) / 0.7) !important;
        
        &:hover {
          background-color: hsla(var(--muted) / 0.5) !important;
        }
      }
      
      .bio-properties-panel-collapsible-entry-content {
        background-color: hsla(var(--background) / 0.2) !important;
        
        /* 嵌套内容暗色样式 */
        .bio-properties-panel-entry {
          border-left: 2px solid hsla(var(--primary) / 0.3) !important;
          
          &:hover {
            background-color: hsla(var(--muted) / 0.2) !important;
            border-left-color: hsl(var(--primary)) !important;
          }
        }
      }
    }
  }
  
  :deep(.bio-properties-panel-header-icon) {
    color: hsl(var(--primary)) !important;
    fill: hsl(var(--primary)) !important;
  }
  
  :deep(.bio-properties-panel-add-entry) {
    fill: hsl(var(--primary)) !important;
    
    &:hover {
      fill: hsl(var(--primary-foreground)) !important;
      background-color: hsla(var(--primary) / 0.2) !important;
    }
  }
  
  /* 活动/选中项视觉指示 */
  :deep(.bio-properties-panel-active) {
    background-color: hsla(var(--primary) / 0.15) !important;
    border-left: 3px solid hsl(var(--primary)) !important;
  }

  /* DMN决策表暗色主题 */
  :deep(.dmn-decision-table-container) {
    background-color: hsl(var(--background-deep)) !important;
    color: hsl(var(--foreground)) !important;
    
    table.dmn-decision-table {
      border-color: hsl(var(--border)) !important;
      
      thead {
        background-color: hsla(var(--primary) / 0.2) !important;
        
        th {
          color: hsl(var(--foreground)) !important;
          border-color: hsl(var(--border)) !important;
        }
      }
      
      tbody tr {
        &:nth-child(odd) {
          background-color: hsla(var(--muted) / 0.1) !important;
        }
        
        &:hover {
          background-color: hsla(var(--primary) / 0.1) !important;
        }
        
        td {
          color: hsl(var(--foreground)) !important;
          border-color: hsl(var(--border)) !important;
        }
      }
    }
  }
  
  /* 决策表属性面板暗色主题 */
  :deep(.dmn-js-properties-panel) {
    .dpp-properties-panel {
      background-color: #141414 !important;
      color: #ffffff !important;
    }
    
    .dpp-properties-header {
      background-color: #1f1f1f !important;
      color: #ffffff !important;
      border-bottom: 1px solid hsla(var(--border) / 0.7) !important;
    }
    
    .dpp-properties-group {
      border-color: hsla(var(--border) / 0.3) !important;
    }
    
    .dpp-properties-entry input,
    .dpp-properties-entry select,
    .dpp-properties-entry textarea {
      background-color: hsla(var(--muted) / 0.7) !important;
      color: #ffffff !important;
      border: 1px solid hsla(var(--border) / 0.8) !important;
    }
  }
}

/* 属性面板元素间距调整 */
:deep(.bio-properties-panel) {
  /* 通用样式 */
  * {
    box-sizing: border-box;
  }
  
  /* 分组内条目的分隔线和间距优化 */
  .bio-properties-panel-group {
    & > .bio-properties-panel-entry {
      position: relative;
      
      /* 分隔线采用渐变效果 */
      &:not(:last-child)::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 8px;
        right: 8px;
        height: 1px;
        background: linear-gradient(to right, 
                                   hsla(var(--border) / 0.1), 
                                   hsla(var(--border) / 0.5), 
                                   hsla(var(--border) / 0.1));
      }
      
      /* 内边距优化 */
      padding-top: 8px !important;
      padding-bottom: 8px !important;
    }
  }
  
  /* 可折叠容器内的属性设置更紧凑 */
  .bio-properties-panel-collapsible-entry-content {
    .bio-properties-panel-entry {
      padding-top: 6px !important;
      padding-bottom: 6px !important;
      margin: 4px 0 !important;
    }
  }
  
  /* 改进表单布局 */
  .bio-properties-panel-input,
  .bio-properties-panel-select {
    width: 100%;
    margin-top: 4px;
  }
  
  /* 改进开关和复选框样式 */
  .bio-properties-panel-checkbox,
  .bio-properties-panel-switch {
    display: flex;
    align-items: center;
    
    label {
      display: inline-flex;
      align-items: center;
      margin-bottom: 0;
      cursor: pointer;
      
      input {
        margin-right: 6px;
        width: auto;
      }
    }
  }
}

/* 添加属性面板微动画 */
:deep(.bio-properties-panel-group-header) {
  transition: background-color 0.2s ease;
}

:deep(.bio-properties-panel-collapsible-entry-header) {
  transition: background-color 0.2s ease;
}

:deep(.bio-properties-panel-entry) {
  transition: background-color 0.15s ease, border-left-color 0.2s ease;
}

/* 暗色主题下的微调 */
.dmn-dark-theme {
  :deep(.bio-properties-panel) {
    .bio-properties-panel-group {
      & > .bio-properties-panel-entry {
        /* 暗色主题下分隔线使用较暗的颜色 */
        &:not(:last-child)::after {
          background: linear-gradient(to right, 
                                     hsla(var(--border) / 0.05), 
                                     hsla(var(--border) / 0.3), 
                                     hsla(var(--border) / 0.05));
        }
      }
    }
  }
}
</style> 
