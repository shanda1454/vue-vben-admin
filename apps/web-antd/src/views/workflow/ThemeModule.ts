/**
 * ThemeModule - Listens for DOM theme changes (light/dark mode) and updates BPMN properties panel
 * ThemeModule - 监听DOM主题变化（明暗模式）并更新BPMN属性面板
 */

interface EventBus {
  fire: (eventName: string, data?: any) => void;
  on: (eventName: string, callback: (event: any) => void) => void;
  off: (eventName: string, callback: (event: any) => void) => void;
}

interface ModelerInstance {
  get: <T>(name: string) => T;
}

/**
 * ThemeModule - Theme handling for BPMN properties panel
 * ThemeModule - BPMN属性面板的主题处理
 */
class ThemeModuleClass {
  private eventBus: EventBus;
  private observer: MutationObserver | null = null;
  private themeChangeCallback: ((event: any) => void) | null = null;

  /**
   * Constructor for the theme module
   * 主题模块的构造函数
   */
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Initialize the theme module by setting up DOM observers
   * 通过设置DOM观察者来初始化主题模块
   */
  init(): void {
    // Watch for html[data-theme] attribute changes
    // 监视html[data-theme]属性的变化
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          this.eventBus.fire('theme.changed', { isDark });
        }
      });
    });

    // Start observing the document element for theme changes
    // 开始观察文档元素的主题变化
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Enable external components to listen for theme changes
    // 允许外部组件监听主题变化
    this.themeChangeCallback = (event: any) => {
      const propertiesPanel = document.querySelector('.bpmn-properties-panel');
      if (propertiesPanel) {
        if (event.isDark) {
          propertiesPanel.classList.add('theme-dark');
          propertiesPanel.classList.remove('theme-light');
        } else {
          propertiesPanel.classList.add('theme-light');
          propertiesPanel.classList.remove('theme-dark');
        }
      }
    };

    this.eventBus.on('theme.changed', this.themeChangeCallback);
  }

  /**
   * Clean up by stopping the observer
   * 通过停止观察者进行清理
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.themeChangeCallback) {
      this.eventBus.off('theme.changed', this.themeChangeCallback);
      this.themeChangeCallback = null;
    }
  }
}

/**
 * Module factory function - creates and registers the ThemeModule
 * 模块工厂函数 - 创建并注册ThemeModule
 */
function ThemeModule(modeler: ModelerInstance): void {
  // Get the event bus from the modeler
  // 从建模器获取事件总线
  const eventBus = modeler.get<EventBus>('eventBus');
  
  // Create and initialize the module
  // 创建并初始化模块
  const module = new ThemeModuleClass(eventBus);
  module.init();
  
  // Listen for diagram destroy event to clean up
  // 监听图表销毁事件以清理
  eventBus.on('diagram.destroy', () => {
    module.destroy();
  });
}

// Define the injection dependencies
// 定义注入依赖
ThemeModule.$inject = ['modeler']; 

// Export the module
// 导出模块
export default ThemeModule; 
