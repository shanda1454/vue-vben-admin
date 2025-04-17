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

/**
 * 自定义主题属性面板提供器
 * Custom Theme Properties Provider
 */
export default function CustomThemePropertiesProvider(
  eventBus: EventBus
): PropertiesProvider {
  // Listen for theme change events
  eventBus.on('theme.changed', function(event: { isDark: boolean }) {
    // Apply theme specific styles to properties panel
    applyThemeToPropertiesPanel(event.isDark);
  });

  // Apply theme styles to properties panel elements
  function applyThemeToPropertiesPanel(isDark: boolean): void {
    // Find the properties panel container
    const panelContainer = document.querySelector('.bpp-properties-panel');
    if (!panelContainer) return;
    
    // Apply theme class
    panelContainer.classList.toggle('bpp-properties-dark', isDark);
    panelContainer.classList.toggle('bpp-properties-light', !isDark);
    
    // Apply additional styling if needed
    // This can be extended based on specific styling requirements
  }
  
  // Return our own simplified provider that doesn't depend on another provider
  return {
    getTabs: function() {
      // Initialize with an empty array, we don't add new tabs
      const tabs: Array<any> = [];
      
      // Apply current theme to properties panel
      setTimeout(() => {
        const isDark = document.documentElement.classList.contains('dark');
        applyThemeToPropertiesPanel(isDark);
      }, 0);
      
      return tabs;
    }
  };
}

// Array of dependencies to be injected
CustomThemePropertiesProvider.$inject = ['eventBus']; 
