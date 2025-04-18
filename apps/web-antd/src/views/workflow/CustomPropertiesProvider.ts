/**
 * BPMN设计器的自定义属性面板提供者
 * 主要处理主题相关样式，支持暗色主题
 * 
 * Custom Properties Provider for BPMN Designer
 * Handles theme-related styles, supports dark theme
 */

/**
 * Custom properties provider that applies theme styles to properties panel
 * 为属性面板应用主题样式的自定义属性提供者
 */

interface PropertiesProvider {
  getTabs: (element: any) => Array<{
    id: string;
    label: string;
    groups: Array<any>;
  }>;
}

interface EventBus {
  fire: (eventName: string, payload?: any) => void;
  on: (eventName: string, callback: Function) => void;
  off: (eventName: string, callback: Function) => void;
}

import { is } from 'bpmn-js/lib/util/ModelUtil';

interface CustomThemePropertiesProviderThis {
  getGroups: () => any[];
}

/**
 * A properties provider that adds custom theme-aware styles to the properties panel
 * 一个为属性面板添加自定义主题感知样式的属性提供程序
 */
export default function CustomThemePropertiesProvider(
  propertiesPanel: any,
  eventBus: any
): CustomThemePropertiesProviderThis {
  // Current theme state
  // 当前主题状态
  let isDark = false;
  
  // Listen for theme changes
  // 监听主题变化
  eventBus.on('theme.changed', function(event: { isDark: boolean }) {
    isDark = event.isDark;
    
    // Apply theme to properties panel
    // 将主题应用到属性面板
    applyThemeToPanel();
  });
  
  // Apply theme styles to properties panel
  // 将主题样式应用到属性面板
  function applyThemeToPanel() {
    const panel = propertiesPanel._container;
    if (!panel) return;
    
    // Remove existing theme classes
    // 移除现有主题类
    panel.classList.remove('bpmn-theme-light', 'bpmn-theme-dark');
    
    // Add appropriate theme class
    // 添加适当的主题类
    panel.classList.add(isDark ? 'bpmn-theme-dark' : 'bpmn-theme-light');
  }
  
  // Initial theme application
  // 初始主题应用
  propertiesPanel.attachTo = function(target: HTMLElement) {
    const originalAttachTo = propertiesPanel.__proto__.attachTo.bind(propertiesPanel);
    originalAttachTo(target);
    
    // Apply theme after panel is attached
    // 面板附加后应用主题
    setTimeout(() => {
      applyThemeToPanel();
    }, 0);
  };
  
  // Return empty array as we don't add actual properties
  // 返回空数组，因为我们不添加实际的属性
  const provider: CustomThemePropertiesProviderThis = {
    getGroups: function() {
      return [];
    }
  };
  
  return provider;
}

CustomThemePropertiesProvider.$inject = [
  'propertiesPanel',
  'eventBus'
]; 
