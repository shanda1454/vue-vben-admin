/**
 * VbenThemeAdapter - integrates Vben Admin theme system with BPMN modeler
 * VbenThemeAdapter - 集成Vben Admin主题系统与BPMN建模器
 */

import { usePreferences } from '@vben/preferences';
import { watch, type WatchStopHandle } from 'vue';

interface EventBus {
  fire: (eventName: string, data?: any) => void;
  on: (eventName: string, callback: (event: any) => void) => void;
}

interface BpmnModeler {
  get: <T>(name: string) => T;
}

/**
 * VbenThemeAdapter - watches for theme changes in Vben Admin and propagates to BPMN
 * VbenThemeAdapter - 监视Vben Admin的主题更改并传播到BPMN
 */
class VbenThemeAdapter {
  private eventBus: EventBus;
  private stopWatcher: WatchStopHandle | null = null;

  /**
   * Constructor for the theme adapter
   * 主题适配器的构造函数
   */
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Initialize the theme adapter by watching for theme changes
   * 通过监视主题更改来初始化主题适配器
   */
  init(): void {
    const preferences = usePreferences();
    
    // Watch for dark mode changes and propagate to BPMN
    // 监视暗黑模式变化并传播到BPMN
    this.stopWatcher = watch(
      () => preferences.isDark,
      (isDark) => {
        try {
          // Fire theme changed event to update BPMN properties panel
          // 触发主题更改事件以更新BPMN属性面板
          this.eventBus.fire('theme.changed', { isDark });
        } catch (error) {
          console.error('Failed to fire theme.changed event', error);
        }
      },
      { immediate: true }
    );
  }

  /**
   * Clean up by stopping the watcher
   * 通过停止监视器进行清理
   */
  destroy(): void {
    if (this.stopWatcher) {
      this.stopWatcher();
      this.stopWatcher = null;
    }
  }
}

/**
 * Module factory function - creates and registers the VbenThemeAdapter
 * 模块工厂函数 - 创建并注册VbenThemeAdapter
 */
export default function VbenThemeAdapterModule(modeler: BpmnModeler): void {
  // Get the event bus from the modeler
  // 从建模器获取事件总线
  const eventBus = modeler.get<EventBus>('eventBus');
  
  // Create and initialize the adapter
  // 创建并初始化适配器
  const adapter = new VbenThemeAdapter(eventBus);
  adapter.init();
  
  // Listen for diagram destroy event to clean up
  // 监听图表销毁事件以清理
  eventBus.on('diagram.destroy', () => {
    adapter.destroy();
  });
} 
