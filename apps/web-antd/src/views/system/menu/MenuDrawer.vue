<script lang="ts" setup>
import { useVbenModal, useVbenForm, alert } from '@vben/common-ui';
import { createMenu, updateMenu, type MenuItem, getMenuList } from '#/api/core/menu';
import { ref, h, computed, watch } from 'vue';
// @ts-ignore
import { $t } from '#/locales';
import { Result } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

// 定义emit-提交触发状态
const emit = defineEmits<{
  success: [];
}>();

// 是否编辑
const isEdit = ref(false);
// 表单数据
const menuData = ref<Partial<MenuItem>>({});

// 定义props接收菜单列表数据
const props = defineProps<{
  menuList?: MenuItem[];
}>();

// 转换菜单列表为树形结构
const menuTreeData = computed(() => {
  if (!props.menuList || props.menuList.length === 0) {
    return [];
  }

  // 创建树形结构
  const buildTree = (items: MenuItem[], parentId: number | null = null): any[] => {
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        label: item.name,
        value: item.id,
        title: $t(item.title),
        key: item.id,
        children: buildTree(items, item.id)
      }));
  };

  // 先添加一个"无父级"选项
  return [
    {
      label: $t('system.menuColumn.noParentMenu'),
      value: 0,
      key: 'root',
      title: $t('system.menuColumn.noParentMenu'),
    },
    ...buildTree(props.menuList)
  ];
});

// 表单
const [formRegister, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  handleSubmit: onSubmit,
  layout: 'horizontal',
  schema: [
    {
      fieldName: 'parentId',
      label: $t('system.menuColumn.parentMenu'),
      component: 'TreeSelect',
      rules: 'required',
      componentProps: {
        class: 'w-full',
        placeholder: '请选择上级菜单',
        allowClear: true,
        treeDefaultExpandAll: true,
        showSearch: true,
        treeData: menuTreeData,
      }
    },
    {
      fieldName: 'title',
      label: $t('system.menuColumn.title'),
      component: 'Input',
      rules: 'required',
      componentProps: {
        onChange: (e: Event) => {
          const target = e.target as HTMLInputElement;
          if (target.value) {
            formApi.setFieldValue('titlePreview', $t(target.value));
          } else {
            formApi.setFieldValue('titlePreview', '');
          }
        },
      }
    },
    {
      fieldName: 'titlePreview',
      label: '标题预览',
      component: 'Input',
      componentProps: {
        disabled: true
      }
    },
    {
      fieldName: 'name',
      label: $t('system.menuColumn.menuName'),
      component: 'Input',
      rules: 'required'
    },
    {
      fieldName: 'path',
      label: $t('system.menuColumn.path'),
      component: 'Input',
      rules: 'required'
    },
    {
      fieldName: 'component',
      label: $t('system.menuColumn.component'),
      component: 'Input',
    },
    {
      fieldName: 'icon',
      label: $t('system.menuColumn.icon'),
      component: 'Input',
    },
    {
      fieldName: 'orderNum',
      label: $t('system.menuColumn.orderNum'),
      component: 'InputNumber',
      defaultValue: 0,
    },
    {
      fieldName: 'status',
      label: $t('system.menuColumn.status'),
      component: 'Select',
      defaultValue: '1',
      componentProps: {
        class: 'w-auto',
        allowClear: false,
        filterOption: true,
        options: [
          {
            label: '启用',
            value: '1',
          },
          {
            label: '禁用',
            value: '0',
          },
        ],
        placeholder: '请选择',
        showSearch: true,
      }
    },
    {
      fieldName: 'affixTab',
      label: $t('system.menuColumn.affixTab'),
      component: 'Switch',
      componentProps: {
        class: 'w-auto',
      },
      defaultValue: false,
    },
  ],
});

// 模态框
const [Modal, modalApi] = useVbenModal({
  get title() {
    return isEdit.value ? $t('system.edit') : $t('system.create');
  },
  closeOnClickModal: false,
  draggable: true,
  showConfirmButton: false,
  showCancelButton: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData();
      console.log('Modal opened, data:', data);
      
      if (data) {
        // 确保深拷贝数据，保留ID
        menuData.value = { ...data };
        
        // 根据是否有 ID 判断是编辑还是新增
        isEdit.value = !!data.id;
        
        if (isEdit.value) {
          // 编辑模式，直接使用全部数据
          formApi.setValues({
            ...data,
            titlePreview: data.title ? $t(data.title) : '',
          });
        } else {
          // 新增模式，只使用parentId（如果存在）
          formApi.resetForm();
          if (data.parentId !== undefined) {
            formApi.setFieldValue('parentId', data.parentId);
          }
        }
      } else {
        formApi.resetForm();
        menuData.value = {}; // 清空保存的数据
        isEdit.value = false;
      }
    }
  }
});

// 提交表单
async function onSubmit(values: Record<string, any>) {
  try {
    // 转换表单数据格式，确保与后端接口一致
    const submitData = {
      name: values.name,
      path: values.path,
      component: values.component || '',
      title: values.title,
      icon: values.icon || '',
      orderNum: values.orderNum || 0,
      parentId: values.parentId || null,
      type: values.type || 'menu',
      status: values.status ? '1' : '0', // 根据后端需要转换格式
      affixTab: values.affixTab || false
    };

    if (menuData.value.id) {
      // 编辑 - 需要包含id
      const updateData = {
        ...submitData,
        id: menuData.value.id
      };
      await updateMenu(menuData.value.id.toString(), updateData);

      alert({
        buttonAlign: 'center',
        content: h(Result, {
          status: 'success',
          subTitle: '已成功编辑菜单',
          title: '操作成功',
        }),
      });
    } else {
      // 新增
      await createMenu(submitData);
      
      alert({
        buttonAlign: 'center',
        content: h(Result, {
          status: 'success',
          subTitle: '已成功新增菜单',
          title: '操作成功',
        }),
      });
    }
    
    // 触发成功事件
    emit('success');
    modalApi.close();
  } catch (error) {
    alert({
      buttonAlign: 'center',
      content: h(Result, {
        status: 'error',
        subTitle: '提交失败',
        title: '操作失败',
      }),
    });
  }
}
</script>
<template>
  <Modal class="p-5"><formRegister/></Modal>
</template>
