<template>
  <div class="ui-showcase min-h-screen bg-[#0a0a0a] text-[#e0e0e0] flex">
    <!-- Sidebar Navigation -->
    <aside class="fixed top-0 left-0 h-screen w-52 flex-shrink-0 bg-[#121212] border-r border-[rgb(255_255_255_/_0.06)] z-40 overflow-y-auto scrollbar-styled">
      <div class="p-5 border-b border-[rgb(255_255_255_/_0.06)]">
        <h1 class="text-lg font-bold text-white tracking-tight">🎨 UI Showcase</h1>
        <p class="text-xs text-gray-500 mt-1">@eno/ui 组件总览</p>
      </div>
      <nav class="p-3 space-y-0.5">
        <a
          v-for="item in navItems"
          :key="item.id"
          :href="`#${item.id}`"
          class="block px-3 py-2 text-sm rounded-lg transition-all duration-150 cursor-pointer"
          :class="activeSection === item.id
            ? 'text-white bg-[rgb(255_255_255_/_0.1)] font-medium'
            : 'text-gray-400 hover:text-white hover:bg-[rgb(255_255_255_/_0.04)]'"
          @click.prevent="scrollTo(item.id)"
        >
          <span class="mr-2">{{ item.icon }}</span>
          {{ item.label }}
        </a>
      </nav>
      <div class="px-5 py-3 border-t border-[rgb(255_255_255_/_0.06)] mt-auto">
        <button
          class="w-full text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1.5"
          @click="routerBack"
        >
          ← 返回应用
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="ml-52 flex-1 min-h-screen">
      <div class="max-w-5xl mx-auto px-8 py-10 space-y-16">
        <!-- Hero -->
        <section class="text-center py-12">
          <h2 class="text-4xl font-bold text-white mb-3 tracking-tight">Component Showcase</h2>
          <p class="text-gray-400 max-w-lg mx-auto leading-relaxed">
            @eno/ui 组件库的交互式展示。点击、拖拽、触发，体验每个组件的完整状态。
          </p>
        </section>

        <!-- ==================== Button ==================== -->
        <section id="button" class="scroll-mt-6">
          <SectionHeader :title="'Button'" :subtitle="'按钮 — 4 种变体 × 3 种尺寸 × 状态'" />
          <ShowcaseCard>
            <div class="space-y-8">
              <!-- Variants -->
              <div>
                <label class="block text-xs text-gray-500 uppercase tracking-wider mb-3">Variants</label>
                <div class="flex flex-wrap gap-3 items-center">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </div>

              <!-- Sizes -->
              <div>
                <label class="block text-xs text-gray-500 uppercase tracking-wider mb-3">Sizes</label>
                <div class="flex flex-wrap gap-3 items-center">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>

              <!-- States -->
              <div>
                <label class="block text-xs text-gray-500 uppercase tracking-wider mb-3">States</label>
                <div class="flex flex-wrap gap-3 items-center">
                  <Button :loading="btnLoading" @click="btnLoading = !btnLoading">
                    {{ btnLoading ? 'Loading…' : 'Toggle Loading' }}
                  </Button>
                  <Button disabled>Disabled</Button>
                  <Button variant="secondary" disabled>Disabled</Button>
                </div>
              </div>

              <!-- Block -->
              <div>
                <label class="block text-xs text-gray-500 uppercase tracking-wider mb-3">Block Mode</label>
                <Button block>Full Width Button</Button>
              </div>
            </div>

            <template #code>
              <pre class="text-xs leading-relaxed">// Variants: primary | secondary | ghost | destructive
// Sizes:    sm | md | lg
// States:   :loading, disabled, :block
&lt;Button variant=&quot;primary&quot; size=&quot;md&quot;&gt;Click Me&lt;/Button&gt;
&lt;Button :loading=&quot;true&quot;&gt;Loading&hellip;&lt;/Button&gt;
&lt;Button disabled&gt;Disabled&lt;/Button&gt;
&lt;Button block&gt;Full Width&lt;/Button&gt;</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- ==================== Input ==================== -->
        <section id="input" class="scroll-mt-6">
          <SectionHeader :title="'Input'" :subtitle="'输入框 — 状态与尺寸'" />
          <ShowcaseCard>
            <div class="space-y-6 max-w-sm">
              <div>
                <label class="block text-xs text-gray-500 uppercase tracking-wider mb-2">Default</label>
                <Input v-model="inputVal" placeholder="Type something…" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 uppercase tracking-wider mb-2">Disabled</label>
                <Input placeholder="Can't type here" disabled />
              </div>
              <div>
                <label class="block text-xs text-gray-500 uppercase tracking-wider mb-2">Sizes</label>
                <div class="space-y-2">
                  <Input v-model="inputSm" size="sm" placeholder="Small" />
                  <Input v-model="inputMd" size="md" placeholder="Medium (default)" />
                  <Input v-model="inputLg" size="lg" placeholder="Large" />
                </div>
              </div>
              <div v-if="inputVal" class="text-xs text-gray-400">
                Value: "<span class="text-[#1db954]">{{ inputVal }}</span>"
              </div>
            </div>
            <template #code>
              <pre class="text-xs leading-relaxed">&lt;Input v-model=&quot;val&quot; placeholder=&quot;&hellip;&quot; /&gt;
&lt;Input placeholder=&quot;Disabled&quot; disabled /&gt;
&lt;Input size=&quot;sm&quot; /&gt;  &lt;!-- sm | md | lg --&gt;</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- ==================== Slider ==================== -->
        <section id="slider" class="scroll-mt-6">
          <SectionHeader :title="'Slider'" :subtitle="'滑块 — 拖拽调节'" />
          <ShowcaseCard>
            <div class="max-w-md space-y-6">
              <Slider :value="sliderVal" @update:value="sliderVal = $event" />
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-400">Value</span>
                <span class="text-white font-mono font-bold tabular-nums">{{ sliderVal }}%</span>
              </div>
              <div class="flex gap-2">
                <Button size="sm" @click="sliderVal = 0">0%</Button>
                <Button size="sm" @click="sliderVal = 25">25%</Button>
                <Button size="sm" @click="sliderVal = 50">50%</Button>
                <Button size="sm" @click="sliderVal = 75">75%</Button>
                <Button size="sm" @click="sliderVal = 100">100%</Button>
              </div>
            </div>
            <template #code>
              <pre class="text-xs leading-relaxed">&lt;Slider
  :value=&quot;percent&quot;
  @update:value=&quot;percent = $event&quot;
/&gt;</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- ==================== ProgressBar ==================== -->
        <section id="progressbar" class="scroll-mt-6">
          <SectionHeader :title="'ProgressBar'" :subtitle="'进度条 — 百分比控制 + 时间显示开关'" />
          <ShowcaseCard>
            <div class="max-w-xl space-y-6">
              <div>
                <ProgressBar
                  :percent="progressVal / 100"
                  :current="Math.round(progressVal * 180 / 100)"
                  :total="180"
                  :show-time="showTime"
                  @seek="progressVal = Math.round($event * 100)"
                />
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <Button size="sm" :variant="progressVal === 25 ? 'primary' : 'secondary'" @click="progressVal = 25">25%</Button>
                <Button size="sm" :variant="progressVal === 50 ? 'primary' : 'secondary'" @click="progressVal = 50">50%</Button>
                <Button size="sm" :variant="progressVal === 75 ? 'primary' : 'secondary'" @click="progressVal = 75">75%</Button>
                <Button size="sm" :variant="progressVal === 100 ? 'primary' : 'secondary'" @click="progressVal = 100">100%</Button>
                <span class="ml-auto flex items-center gap-2 text-sm text-gray-400">
                  <span>Time:</span>
                  <button
                    class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200"
                    :class="showTime ? 'bg-[#1db954]' : 'bg-[rgb(255_255_255_/_0.15)]'"
                    @click="showTime = !showTime"
                  >
                    <span
                      class="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200"
                      :class="showTime ? 'translate-x-[18px]' : 'translate-x-[3px]'"
                    />
                  </button>
                </span>
              </div>
            </div>
            <template #code>
              <pre class="text-xs leading-relaxed">&lt;ProgressBar
  :percent=&quot;0.5&quot;
  :current=&quot;90&quot;
  :total=&quot;180&quot;
  :show-time=&quot;true&quot;
  @seek=&quot;onSeek&quot;
/&gt;</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- ==================== PlayControlBar ==================== -->
        <section id="playcontrolbar" class="scroll-mt-6">
          <SectionHeader :title="'PlayControlBar'" :subtitle="'播放控制栏 — 播放/暂停 + 左右插槽'" />
          <ShowcaseCard>
            <div class="space-y-6">
              <div class="flex items-center justify-center py-4">
                <PlayControlBar
                  :is-playing="isPlaying"
                  play-key="toggle"
                  @toggle="isPlaying = !isPlaying"
                  @prev="msgInfo = '⏮ Previous'"
                  @next="msgInfo = '⏭ Next'"
                >
                  <template #left>
                    <span class="text-xs text-gray-500 mr-2">L</span>
                  </template>
                  <template #right>
                    <span class="text-xs text-gray-500 ml-2">R</span>
                  </template>
                </PlayControlBar>
              </div>
              <div class="text-center text-sm text-gray-400">
                {{ isPlaying ? '▶️ Playing' : '⏸ Paused' }}
                <span v-if="msgInfo" class="ml-3 text-[#1db954]">{{ msgInfo }}</span>
              </div>
            </div>
            <template #code>
              <pre class="text-xs leading-relaxed">&lt;PlayControlBar
  :is-playing=&quot;isPlaying&quot;
  play-key=&quot;toggle&quot;
  @toggle=&quot;isPlaying = !isPlaying&quot;
  @prev=&quot;onPrev&quot;
  @next=&quot;onNext&quot;
&gt;
  &lt;template #left&gt;&hellip;&lt;/template&gt;
  &lt;template #right&gt;&hellip;&lt;/template&gt;
&lt;/PlayControlBar&gt;</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- ==================== LoopSwitch ==================== -->
        <section id="loopswitch" class="scroll-mt-6">
          <SectionHeader :title="'LoopSwitch'" :subtitle="'循环模式切换 — 点击轮换 list → single → random'" />
          <ShowcaseCard>
            <div class="flex items-center gap-6">
              <LoopSwitch v-model="loopMode" @change="onLoopChange" />
              <span class="text-sm text-gray-400">
                Mode:
                <span class="text-white font-medium ml-1 capitalize">{{ loopModeLabel }}</span>
              </span>
              <button
                class="text-xs text-gray-500 hover:text-white transition-colors underline underline-offset-2"
                @click="loopMode = 'list'"
              >
                Reset
              </button>
            </div>
            <template #code>
              <pre class="text-xs leading-relaxed">&lt;LoopSwitch v-model=&quot;mode&quot; /&gt;
// mode: 'list' | 'single' | 'random'</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- ==================== Dialog ==================== -->
        <section id="dialog" class="scroll-mt-6">
          <SectionHeader :title="'Dialog'" :subtitle="'模态对话框 — 标题 + 内容 + 关闭'" />
          <ShowcaseCard>
            <Button @click="dialogOpen = true">Open Dialog</Button>

            <Dialog
              :open="dialogOpen"
              :title="'🎉 欢迎来到 UI Showcase'"
              @visible-change="dialogOpen = $event"
            >
              <div class="space-y-3">
                <p>这是 @eno/ui 的 Dialog 组件。</p>
                <p class="text-gray-400 text-sm">
                  你可以在这里放置任何内容，包括表单、文字、图片等。
                  点击遮罩层或右上角的 ✕ 按钮即可关闭。
                </p>
                <div class="bg-[rgb(255_255_255_/_0.04)] rounded-lg p-4 mt-4">
                  <p class="text-sm text-[#1db954] font-medium">✨ 提示</p>
                  <p class="text-xs text-gray-400 mt-1">Dialog 基于原生 &lt;dialog&gt; 元素构建，支持键盘 ESC 关闭。</p>
                </div>
              </div>
              <template #footer>
                <Button variant="ghost" @click="dialogOpen = false">取消</Button>
                <Button @click="dialogOpen = false">确定</Button>
              </template>
            </Dialog>

            <template #code>
              <pre class="text-xs leading-relaxed">&lt;Dialog
  :open=&quot;open&quot;
  title=&quot;Dialog Title&quot;
  @visible-change=&quot;open = $event&quot;
&gt;
  &lt;p&gt;Content here&lt;/p&gt;
  &lt;template #footer&gt;
    &lt;Button&gt;OK&lt;/Button&gt;
  &lt;/template&gt;
&lt;/Dialog&gt;</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- ==================== Drawer ==================== -->
        <section id="drawer" class="scroll-mt-6">
          <SectionHeader :title="'Drawer'" :subtitle="'抽屉 — 四个方向'" />
          <ShowcaseCard>
            <div class="flex flex-wrap gap-3">
              <Button @click="openDrawer('left')">← Left</Button>
              <Button @click="openDrawer('right')">Right →</Button>
              <Button @click="openDrawer('top')">↑ Top</Button>
              <Button @click="openDrawer('bottom')">↓ Bottom</Button>
            </div>

            <Drawer
              :open="drawerPos === 'left'"
              :title="'左侧抽屉'"
              position="left"
              @visible-change="closeDrawer"
            >
              <p class="text-gray-300">从左侧滑入的抽屉内容。</p>
            </Drawer>
            <Drawer
              :open="drawerPos === 'right'"
              :title="'右侧抽屉'"
              position="right"
              @visible-change="closeDrawer"
            >
              <p class="text-gray-300">从右侧滑入的抽屉内容。</p>
            </Drawer>
            <Drawer
              :open="drawerPos === 'top'"
              :title="'顶部抽屉'"
              position="top"
              @visible-change="closeDrawer"
            >
              <p class="text-gray-300">从顶部滑入的抽屉内容。</p>
            </Drawer>
            <Drawer
              :open="drawerPos === 'bottom'"
              :title="'底部抽屉'"
              position="bottom"
              @visible-change="closeDrawer"
            >
              <p class="text-gray-300">从底部滑入的抽屉内容。</p>
            </Drawer>

            <template #code>
              <pre class="text-xs leading-relaxed">&lt;Drawer
  :open=&quot;open&quot;
  title=&quot;Title&quot;
  position=&quot;right&quot;
  @visible-change=&quot;open = $event&quot;
&gt;
  Content&hellip;
&lt;/Drawer&gt;
// position: 'left' | 'right' | 'top' | 'bottom'</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- ==================== DrawerSlideUp ==================== -->
        <section id="drawerslideup" class="scroll-mt-6">
          <SectionHeader :title="'DrawerSlideUp'" :subtitle="'全屏上滑抽屉'" />
          <ShowcaseCard>
            <Button @click="slideUpOpen = true">Open SlideUp</Button>

            <DrawerSlideUp
              :open="slideUpOpen"
              :title="'全屏上滑面板'"
              @visible-change="slideUpOpen = $event"
            >
              <div class="space-y-4">
                <p>这是一个全屏上滑的 DrawerSlideUp 组件。</p>
                <p class="text-gray-400 text-sm">适合展示需要全屏聚焦的内容，例如详情页、设置面板等。</p>
                <div class="grid grid-cols-2 gap-3 mt-4">
                  <div class="bg-[rgb(255_255_255_/_0.04)] rounded-lg p-4">
                    <p class="text-lg font-bold text-white">128</p>
                    <p class="text-xs text-gray-500">Items</p>
                  </div>
                  <div class="bg-[rgb(255_255_255_/_0.04)] rounded-lg p-4">
                    <p class="text-lg font-bold text-white">24</p>
                    <p class="text-xs text-gray-500">New</p>
                  </div>
                </div>
              </div>
            </DrawerSlideUp>

            <template #code>
              <pre class="text-xs leading-relaxed">&lt;DrawerSlideUp
  :open=&quot;open&quot;
  title=&quot;Title&quot;
  @visible-change=&quot;open = $event&quot;
&gt;
  Content&hellip;
&lt;/DrawerSlideUp&gt;</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- ==================== Loading ==================== -->
        <section id="loading" class="scroll-mt-6">
          <SectionHeader :title="'Loading'" :subtitle="'加载指示器'" />
          <ShowcaseCard>
            <div class="flex items-center justify-center py-8">
              <Loading />
            </div>
            <template #code>
              <pre class="text-xs leading-relaxed">&lt;Loading /&gt;</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- ==================== Message ==================== -->
        <section id="message" class="scroll-mt-6">
          <SectionHeader :title="'Message'" :subtitle="'消息提示 — 编程式调用'" />
          <ShowcaseCard>
            <div class="flex flex-wrap gap-3">
              <Button @click="MessageAPI.success('操作成功完成！')">Success</Button>
              <Button variant="destructive" @click="MessageAPI.error('操作失败，请重试。')">Error</Button>
              <Button variant="secondary" @click="MessageAPI.warning('请注意检查输入内容。')">Warning</Button>
              <Button variant="ghost" @click="MessageAPI.info('这是一条普通信息。')">Info</Button>
            </div>
            <template #code>
              <pre class="text-xs leading-relaxed">// 编程式调用，自动挂载与销毁
MessageAPI.success('Success!')
MessageAPI.error('Error!')
MessageAPI.warning('Warning!')
MessageAPI.info('Info!')
// 或
MessageAPI.show({ message: '&hellip;', type: 'success', duration: 3000 })</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- ==================== TabItem ==================== -->
        <section id="tabitem" class="scroll-mt-6">
          <SectionHeader :title="'TabItem'" :subtitle="'标签项 — 带 active 状态切换'" />
          <ShowcaseCard>
            <div class="max-w-xs">
              <TabItem
                v-for="tab in tabs"
                :key="tab.id"
                :title="tab.label"
                :active="activeTab === tab.id"
                @click="activeTab = tab.id"
              />
            </div>
            <template #code>
              <pre class="text-xs leading-relaxed">&lt;TabItem
  title=&quot;Home&quot;
  :active=&quot;active&quot;
  @click=&quot;active = true&quot;
/&gt;</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- ==================== Icon ==================== -->
        <section id="icon" class="scroll-mt-6">
          <SectionHeader :title="'Icon'" :subtitle="'图标库 — 内置所有图标一览'" />
          <ShowcaseCard>
            <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              <div
                v-for="icon in iconNames"
                :key="icon"
                class="flex flex-col items-center gap-2 p-4 rounded-lg bg-[rgb(255_255_255_/_0.03)] hover:bg-[rgb(255_255_255_/_0.07)] transition-colors cursor-pointer group"
                @click="copyIconName(icon)"
              >
                <Icon :name="icon" class="text-2xl text-gray-300 group-hover:text-white transition-colors" />
                <span class="text-[10px] text-gray-500 group-hover:text-gray-300 text-center leading-tight transition-colors">{{ icon }}</span>
              </div>
            </div>
            <div v-if="copiedIcon" class="mt-4 text-center text-xs text-[#1db954] animate-pulse">
              Copied: "{{ copiedIcon }}"
            </div>
            <template #code>
              <pre class="text-xs leading-relaxed">&lt;Icon name=&quot;play&quot; /&gt;
&lt;Icon name=&quot;spinner&quot; /&gt;
&lt;Icon name=&quot;check-circle&quot; /&gt;
// See grid above for all available names</pre>
            </template>
          </ShowcaseCard>
        </section>

        <!-- Footer -->
        <footer class="text-center py-10 text-xs text-gray-600 border-t border-[rgb(255_255_255_/_0.04)]">
          @eno/ui — Component Showcase
        </footer>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Button, Input, Slider, ProgressBar, PlayControlBar, LoopSwitch,
  Dialog, Drawer, DrawerSlideUp, Loading, TabItem, Icon, Message, MessageAPI,
} from '@cloudfly/eno-ui'

const router = useRouter()

// ─── Sub-Components ─────────────────────────────────────────
/**
 * SectionHeader — renders a consistent section heading with subtitle
 */
const SectionHeader = defineComponent({
  props: { title: String, subtitle: String },
  setup(props) {
    return () =>
      h('div', { class: 'mb-6' }, [
        h('h2', { class: 'text-2xl font-bold text-white tracking-tight' }, props.title),
        props.subtitle
          ? h('p', { class: 'text-sm text-gray-500 mt-1' }, props.subtitle)
          : null,
      ])
  },
})

/**
 * ShowcaseCard — renders a dark card with a demo area and optional code block
 */
const ShowcaseCard = defineComponent({
  setup(_, { slots }) {
    return () =>
      h('div', { class: 'bg-[#181818] border border-[rgb(255_255_255_/_0.06)] rounded-xl overflow-hidden' }, [
        h('div', { class: 'p-6' }, slots.default?.()),
        slots.code
          ? h('div', { class: 'border-t border-[rgb(255_255_255_/_0.06)] bg-[rgb(0_0_0_/_0.3)]' }, [
              h('div', { class: 'p-4 overflow-x-auto' }, [
                h('div', { class: 'flex items-center gap-2 mb-2' }, [
                  h('span', { class: 'text-[10px] text-gray-600 uppercase tracking-wider font-mono' }, 'Code'),
                  h('div', { class: 'h-px flex-1 bg-[rgb(255_255_255_/_0.04)]' }),
                ]),
                slots.code(),
              ]),
            ])
          : null,
      ])
  },
})

// ─── Navigation ─────────────────────────────────────────────
const navItems = [
  { id: 'button', label: 'Button', icon: '🔘' },
  { id: 'input', label: 'Input', icon: '⌨️' },
  { id: 'slider', label: 'Slider', icon: '🎚️' },
  { id: 'progressbar', label: 'ProgressBar', icon: '📊' },
  { id: 'playcontrolbar', label: 'PlayControlBar', icon: '▶️' },
  { id: 'loopswitch', label: 'LoopSwitch', icon: '🔁' },
  { id: 'dialog', label: 'Dialog', icon: '💬' },
  { id: 'drawer', label: 'Drawer', icon: '📦' },
  { id: 'drawerslideup', label: 'DrawerSlideUp', icon: '⬆️' },
  { id: 'loading', label: 'Loading', icon: '⏳' },
  { id: 'message', label: 'Message', icon: '📨' },
  { id: 'tabitem', label: 'TabItem', icon: '📑' },
  { id: 'icon', label: 'Icon', icon: '🎯' },
]

const activeSection = ref('')

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        activeSection.value = entry.target.id
      }
    }
  },
  { rootMargin: '-80px 0px -60% 0px' },
)

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
    history.replaceState(null, '', `#${id}`)
  }
}

function routerBack() {
  router.push('/')
}

// Observe sections on mount
onMounted(() => {
  document.querySelectorAll('section[id]').forEach((el) => observer.observe(el))
  if (location.hash) {
    const id = location.hash.slice(1)
    setTimeout(() => scrollTo(id), 200)
  }
})
onUnmounted(() => observer.disconnect())

// ─── Button ─────────────────────────────────────────────────
const btnLoading = ref(false)

// ─── Input ──────────────────────────────────────────────────
const inputVal = ref('')
const inputSm = ref('')
const inputMd = ref('')
const inputLg = ref('')

// ─── Slider ─────────────────────────────────────────────────
const sliderVal = ref(65)

// ─── ProgressBar ────────────────────────────────────────────
const progressVal = ref(33)
const showTime = ref(true)

// ─── PlayControlBar ─────────────────────────────────────────
const isPlaying = ref(false)
const msgInfo = ref('')

// ─── LoopSwitch ─────────────────────────────────────────────
const loopMode = ref<'list' | 'single' | 'random'>('list')

const loopModeLabel = computed(() => {
  const map: Record<string, string> = {
    list: '🔁 List Loop',
    single: '🔂 Repeat One',
    random: '🔀 Shuffle',
  }
  return map[loopMode.value] ?? loopMode.value
})

function onLoopChange(_val: 'list' | 'single' | 'random') {
  // handled by v-model
}

// ─── Dialog ─────────────────────────────────────────────────
const dialogOpen = ref(false)

// ─── Drawer ────────────────────────────────────────────────
const drawerPos = ref<string | null>(null)

function openDrawer(pos: string) {
  drawerPos.value = pos
}

function closeDrawer(val: boolean) {
  if (!val) drawerPos.value = null
}

// ─── DrawerSlideUp ─────────────────────────────────────────
const slideUpOpen = ref(false)

// ─── TabItem ───────────────────────────────────────────────
const tabs = [
  { id: 'home', label: '🏠 Home' },
  { id: 'explore', label: '🔍 Explore' },
  { id: 'library', label: '📚 Library' },
  { id: 'settings', label: '⚙️ Settings' },
]
const activeTab = ref('home')

// ─── Icon ──────────────────────────────────────────────────
const iconNames = [
  'skip-previous', 'skip-forward', 'play', 'pause',
  'shuffle', 'repeat', 'repeat-one',
  'close-line', 'close-fill',
  'check-circle', 'close-circle', 'warning', 'information',
  'spinner',
]

const copiedIcon = ref('')

function copyIconName(name: string) {
  copiedIcon.value = name
  setTimeout(() => { copiedIcon.value = '' }, 1500)
}
</script>

<style scoped>
.ui-showcase {
  scroll-behavior: smooth;
}

.scrollbar-styled::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-styled::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-styled::-webkit-scrollbar-thumb {
  background: rgb(255 255 255 / 0.12);
  border-radius: 2px;
}
.scrollbar-styled::-webkit-scrollbar-thumb:hover {
  background: rgb(255 255 255 / 0.25);
}

section[id] {
  scroll-margin-top: 24px;
}
</style>
