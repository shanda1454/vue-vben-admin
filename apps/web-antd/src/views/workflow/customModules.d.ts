// 为DMN相关模块提供类型声明
declare module 'dmn-js/lib/Modeler' {
  export default class DmnModeler {
    constructor(options: any);
    importXML(xml: string): Promise<{ warnings: Array<string> }>;
    saveXML(options?: { format?: boolean }): Promise<{ xml: string }>;
    getViews(): Array<any>;
    open(view: any): void;
    getActiveViewer(): any;
    on(event: string, callback: Function): void;
    off(event: string, callback: Function): void;
    destroy(): void;
  }
}

declare module 'dmn-js-properties-panel' {
  export const DmnPropertiesPanelModule: any;
  export const DmnPropertiesProviderModule: any;
}

declare module '@vben/locales' {
  export function useI18n(): {
    t: (key: string, args?: any[]) => string;
  };
}

declare module '@vben/preferences' {
  export function usePreferences(): {
    isDark: { value: boolean };
  };
}

declare module '#/locales' {
  export const antdLocale: { value?: { locale: string } };
}

declare module '#/locales/lang/zh-CN/dmnTranslations' {
  export const dmnTranslations: {
    zh: Record<string, string>;
    en: Record<string, string>;
  };
}

declare module './composables/dmnTemplate' {
  export function createDmnXML(): string;
} 
