<script setup>
import cn from 'classnames'
import { ref } from 'vue'
import { useDialogController } from '@/composables/useDialogController'

const props = defineProps({
  open: Boolean,
  title: String,
  class: String,
  headerClass: String,
  bodyClass: String,
  footerClass: String,
  titleClass: String,
})
const emit = defineEmits(['visibleChange'])
const dialogRef = ref(null)

const { handleClose, handleCancel } = useDialogController({
  dialogRef,
  open: () => props.open,
  onRequestClose: () => emit('visibleChange', false),
  lockBodyScroll: true,
})

function close() {
  emit('visibleChange', false)
}

function clickDialog(e) {
  const rect = dialogRef.value.getBoundingClientRect()
  const isInDialog =
    rect.top <= e.clientY &&
    e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX &&
    e.clientX <= rect.left + rect.width

  if (!isInDialog) {
    close()
  }
}
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogRef"
      :class="cn(
        'backdrop:bg-black/60 backdrop:backdrop-blur-sm p-0 focus:outline-none w-[480px] max-w-[90vw] eno-dialog',
        props.class
      )"
      @click="clickDialog"
      @close="handleClose"
      @cancel="handleCancel"
    >
      <!-- 标题栏 -->
      <div v-if="$slots.header" :class="cn('eno-dialog__header', props.headerClass)">
        <slot name="header" />
      </div>
      <div v-else class="eno-dialog__header" :class="props.headerClass">
        <h3 class="eno-dialog__title" :class="props.titleClass">
          {{ props.title }}
        </h3>
        <button class="rounded-full p-1 hover:bg-white/10 transition-colors cursor-pointer" @click.stop="close">
          <div class="i-mingcute:close-line w-6 h-6 text-gray-400 hover:text-white" />
        </button>
      </div>

      <!-- 内容区域 -->
      <div :class="cn('eno-dialog__body overflow-y-auto custom-scrollbar', props.bodyClass)">
        <slot />
      </div>

      <!-- 底部区域 -->
      <div v-if="$slots.footer" :class="cn('eno-dialog__footer', props.footerClass)">
        <slot name="footer" />
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  animation: zoomIn 0.2s ease-out;
}

dialog::backdrop {
  background: rgba(0, 0, 0, 0.7);
  animation: fadeIn 0.2s ease-out;
}

/* 隐藏默认的 dialog 样式 */
dialog:not([open]) {
  display: none;
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }

  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
</style>
