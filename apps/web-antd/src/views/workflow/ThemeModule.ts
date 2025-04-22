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
    console.log('[ThemeModule] 初始化主题变化检测模块');

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
      const isDark = event.isDark;
      console.log('[ThemeModule] 接收到主题变化:', isDark ? '暗色' : '亮色');
      
      // 应用自定义CSS变量到属性面板
      this.applyCustomCssToPropertiesPanel(isDark);
    };

    this.eventBus.on('theme.changed', this.themeChangeCallback);

    // 尝试初始化属性面板样式
    this.applyInitialPanelStyles();
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

  // 应用初始面板样式
  private applyInitialPanelStyles(): void {
    // 延迟执行以确保面板已渲染
    setTimeout(() => {
      try {
        // 获取当前主题状态
        const isDark = document.body.classList.contains('dark') || 
                      document.documentElement.classList.contains('dark');
                      
        // 应用到属性面板
        this.applyCustomCssToPropertiesPanel(isDark);
      } catch (error) {
        console.warn('[ThemeModule] 应用初始面板样式失败:', error);
      }
    }, 500);
  }

  // 应用自定义CSS到属性面板
  private applyCustomCssToPropertiesPanel(isDark: boolean): void {
    try {
      // 尝试获取属性面板元素
      const panels = document.querySelectorAll('.bio-properties-panel');
      if (!panels || panels.length === 0) return;
      
      console.log('[ThemeModule] 应用主题样式到', panels.length, '个属性面板');
      
      // 针对每个面板应用样式
      panels.forEach(panel => {
        // 修复图标颜色
        const icons = panel.querySelectorAll('.bio-properties-panel-header-icon, .bio-properties-panel-add-entry, .bio-properties-panel-arrow-right, .bio-properties-panel-collapsible-entry-arrow');
        
        icons.forEach(icon => {
          // 获取根CSS变量中的主色调
          const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
          const primaryForeground = getComputedStyle(document.documentElement).getPropertyValue('--primary-foreground').trim();
          
          if (icon) {
            // 直接设置颜色
            icon.style.color = `hsl(${primaryColor})`;
            icon.style.fill = `hsl(${primaryColor})`;
            
            // 修复SVG内部元素
            const svgElements = icon.querySelectorAll('svg, path, circle, rect, polygon');
            svgElements.forEach(el => {
              el.style.fill = `hsl(${primaryColor})`;
              el.style.color = `hsl(${primaryColor})`;
            });
          }
        });
        
        // 修复点标记颜色
        const dots = panel.querySelectorAll('.bio-properties-panel-dot');
        dots.forEach(dot => {
          const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
          if (dot) {
            dot.style.backgroundColor = `hsl(${primaryColor})`;
          }
        });
      });
    } catch (error) {
      console.warn('[ThemeModule] 应用自定义CSS到属性面板失败:', error);
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
