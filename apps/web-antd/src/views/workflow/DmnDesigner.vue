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
  DmnPropertiesProviderModule,
  CamundaPropertiesProviderModule
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
      const locale = antdLocale.value?.locale;
      currentLocale.value = locale === 'en_US' ? 'en' : 'zh';
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

          const isNewLocaleEn = newLocale.locale === 'en';

          // 映射到DMN支持的格式
          const dmnLocale = isNewLocaleEn ? 'en' : 'zh';

          // 只有当语言发生变化时才更新
          if (currentLocale.value !== dmnLocale) {
            // 更新当前语言变量
            currentLocale.value = dmnLocale;

            // 确保DmnModeler已初始化
            if (dmnModeler) {
              try {
                // DMN编辑器的视图数组
                const views = dmnModeler.getViews();
                const activeView = dmnModeler.getActiveView();

                // 刷新当前视图，应用新语言
                if (activeView && activeView.element) {
                  // 获取当前激活的视图
                  const currentViewType = activeView.type;
                  const currentElement = activeView.element;

                  // 查找视图索引
                  let viewIdx = -1;
                  for (let i = 0; i < views.length; i++) {
                    if (views[i].element === currentElement) {
                      viewIdx = i;
                      break;
                    }
                  }

                  if (viewIdx !== -1) {
                    // 关闭当前视图
                    dmnModeler.closeView(viewIdx);

                    // 重新打开视图以应用新语言
                    setTimeout(() => {
                      dmnModeler.open(viewIdx);
                      message.success(
                        `DMN设计器语言已切换到${dmnLocale === 'zh' ? '中文' : '英文'}`,
                      );
                    }, 50);
                  }
                }
              } catch (error) {
                console.warn('切换语言时发生错误:', error);
                
                // 尝试重新初始化整个modeler
                dmnModeler
                  .saveXML({ format: true })
                  .then(({ xml }) => {
                    // 销毁当前modeler
                    dmnModeler?.destroy();
                    dmnModeler = null;

                    // 重新初始化
                    setTimeout(() => {
                      initDmnModeler();

                      // 导入保存的图表
                      setTimeout(() => {
                        if (dmnModeler) {
                          dmnModeler.importXML(xml).catch((error) => {
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
                    '[DMN i18n] 切换语言:',
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
              CamundaPropertiesProviderModule,
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
        dmnModeler.on('views.changed', (event) => {
          const { activeView } = event;
          if (activeView) {
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
            const eventBus = dmnModeler._getGlobalEventBus && dmnModeler._getGlobalEventBus();
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
        v-for="(view, idx) in dmnModeler?.getViews() || []" 
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
          <div class="dmn-properties-panel-header">{{ t('dmn.properties.title') }}</div>
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
      overflow: auto;
      border-left: 1px solid hsl(var(--border));
      
      .dmn-properties-panel {
        width: 100%;
        height: calc(100% - 45px);
        overflow: auto;
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

// 去掉DMN的自带logo
:deep(.djs-minimap) {
  .bjs-powered-by {
    display: none !important;
  }
}

// 常用覆盖样式
:deep(.bio-properties-panel) {
  background-color: transparent !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji' !important;
}

:deep(.bio-properties-panel-header) {
  padding: 8px 15px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
}

:deep(.bio-properties-panel-group-header) {
  padding: 6px 10px !important;
  font-size: 13px !important;
}

:deep(.bio-properties-panel-entry) {
  margin: 4px 0 !important;
  font-size: 13px !important;
}

:deep(input), :deep(select), :deep(textarea) {
  font-size: 13px !important;
  font-family: inherit !important;
}

// DMN决策表自定义样式
:deep(.dmn-decision-table-container) {
  table.dmn-decision-table {
    th, td {
      font-size: 13px !important;
    }
  }
}

// 暗色主题支持
.dmn-dark-theme {
  :deep(.bio-properties-panel) {
    background-color: hsl(var(--background)) !important;
    color: hsl(var(--foreground)) !important;
  }
  
  :deep(.bio-properties-panel-header) {
    background-color: hsla(var(--primary) / 0.2) !important;
    color: hsl(var(--foreground)) !important;
    border-color: hsl(var(--border)) !important;
  }
  
  :deep(.bio-properties-panel-group) {
    border-color: hsl(var(--border)) !important;
    
    .bio-properties-panel-group-header {
      background-color: hsla(var(--muted) / 0.3) !important;
      color: hsl(var(--foreground)) !important;
    }
    
    .bio-properties-panel-entry {
      border-color: hsla(var(--border) / 0.5) !important;
      
      input, select, textarea {
        background-color: hsla(var(--input) / 0.8) !important;
        color: hsl(var(--foreground)) !important;
        border-color: hsl(var(--input)) !important;
      }
    }
  }
  
  // DMN决策表暗色主题
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
}
</style> 
