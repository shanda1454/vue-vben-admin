/**
 * BPMN自定义单据属性面板提供器
 */

// 定义基本类型
interface ElementBusinessObject {
  $attrs: {
    [key: string]: any;
  };
  [key: string]: any;
}

interface BpmnElement {
  businessObject: ElementBusinessObject;
  [key: string]: any;
}

interface PropertyEntry {
  id: string;
  label: string;
  modelProperty: string;
  get: (element: BpmnElement) => any;
  set: (element: BpmnElement, values: any) => any;
}

interface PropertyGroup {
  id: string;
  label: string;
  entries: PropertyEntry[];
}

interface Tab {
  id: string;
  label: string;
  groups: PropertyGroup[];
}

// 获取所有类型的元素都会显示的通用属性
function getDocumentProperties(element: BpmnElement): PropertyGroup {
  return {
    id: 'documentProperties',
    label: '单据属性',
    entries: [
      {
        id: 'documentNumber',
        label: '单据编号',
        modelProperty: 'documentNumber',
        get: function(element: BpmnElement) {
          // 获取camunda:documentNumber属性值，如果不存在返回空字符串
          return {
            documentNumber: element.businessObject.$attrs['camunda:documentNumber'] || ''
          };
        },
        set: function(element: BpmnElement, values: {documentNumber: string}) {
          // 设置camunda:documentNumber属性值
          return {
            'camunda:documentNumber': values.documentNumber || undefined
          };
        }
      }
    ]
  };
}

/**
 * 自定义单据属性提供者
 */
export default function CustomDocumentProvider(propertiesPanel: any, translate: any): void {
  // 为propertiesPanel注册属性提供者
  propertiesPanel.registerProvider(500, this); // 高优先级确保显示在靠前位置

  // 获取属性选项卡
  this.getTabs = function(element: BpmnElement) {
    return function(tabs: Tab[]) {
      // 寻找常规选项卡
      const generalTab = tabs.find(tab => tab.id === 'general');
      if (generalTab && generalTab.groups) {
        // 添加单据属性组到常规选项卡
        generalTab.groups.push(getDocumentProperties(element));
      }
      return tabs;
    };
  };
}

// 定义模块
CustomDocumentProvider.$inject = ['propertiesPanel', 'translate']; 
