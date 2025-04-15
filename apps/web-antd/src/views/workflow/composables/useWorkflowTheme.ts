import { usePreferences } from '@vben/preferences';

export function useWorkflowTheme(containerRef: any) {
  // 获取主题信息
  const { isDark } = usePreferences();

  // 应用主题样式
  const applyTheme = () => {
    if (!containerRef.value) return;

    const container = containerRef.value;

    // 应用暗色主题或亮色主题样式
    if (isDark.value) {
      container.classList.add('workflow-dark-theme');
    } else {
      container.classList.remove('workflow-dark-theme');
    }
  };

  // 组件挂载时调用
  const initTheme = () => {
    applyTheme();
  };

  return {
    isDark,
    initTheme,
    applyTheme,
  };
}
