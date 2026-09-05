<script setup lang="ts">
import { Dialog } from '@cloudfly/eno-ui'
import { usePlaylistStore } from '@/playlist/store'
import { ref, watch } from 'vue'

interface Point {
  x: number
  y: number
}

const exportResolutions = ['1080p', '4k', '8k', '16k']

const PLstore = usePlaylistStore()
// PLstore.posters 海报列表
const selectedPosters = ref<string[]>([])
watch(() => PLstore.posters, (posters) => {
  // 如果 posters 是 undefined 或 null，默认为空数组
  selectedPosters.value = Array.isArray(posters) ? posters : []
}, { immediate: true })

const isRandomMode = ref(false)

watch(isRandomMode, () => {
  generatePosterCanvas()
})

function highlightText() {
  const text = document.getElementById('highlightText')
  if (text) {
    let isYellow = true
    const interval = setInterval(() => {
      text.style.color = isYellow ? 'red' : 'white'
      isYellow = !isYellow
    }, 500)

    // 5秒后停止闪烁
    setTimeout(() => {
      clearInterval(interval)
      text.style.color = 'white'
    }, 5000)
  }
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
// 添加 canvas 尺寸设置
const canvasWidth = 7680
const canvasHeight = 4320
// 默认配置
const defaultConfig: GridConfig = {
  columns: 5,
  gap: 20,
  padding: 40,
  oddColumnOffset: 100, // 奇数列向上偏移10%
  evenColumnOffset: 200, // 偶数列向上偏移1/2
}

const config = ref<GridConfig>({ ...defaultConfig })

const isExporting = ref(false)

watch(() => selectedPosters.value, (_posters) => {
  generatePosterCanvas()
}, {
  immediate: true,
  deep: true,
})

// 定义分辨率映射
interface Resolution {
  width: number
  height: number
}

const resolutionMap: Record<string, Resolution> = {
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
  '8k': { width: 7680, height: 4320 },
  '16k': { width: 15360, height: 8640 },
}

// 修改导出函数
async function handleExportResolution(resolution: string) {
  if (isExporting.value) return
  
  const canvas = canvasRef.value
  if (!canvas)
    return

  isExporting.value = true

  // 获取新的尺寸
  const newSize = resolutionMap[resolution]
  if (!newSize) {
    isExporting.value = false
    return
  }

  // 保存当前尺寸
  const originalWidth = canvas.width
  const originalHeight = canvas.height
  const originalConfig = { ...config.value }

  try {
    // 更新画布尺寸
    canvas.width = newSize.width
    canvas.height = newSize.height
    
    // 调整配置以适应新的尺寸
    config.value = {
      ...config.value,
      padding: Math.round(newSize.width * 0.02), // 2%的边距
      gap: Math.round(newSize.width * 0.01), // 1%的间距
      oddColumnOffset: Math.round(newSize.height * 0.1), // 10%的偏移
      evenColumnOffset: Math.round(newSize.height * 0.5), // 50%的偏移
    }

    // 重新生成海报
    await generatePosterCanvas({ width: newSize.width, height: newSize.height })

    // 导出图片
    const link = document.createElement('a')
    link.download = `poster-${resolution}-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  catch (error) {
    console.error('Export failed:', error)
  }
  finally {
    // 恢复原始尺寸和配置
    canvas.width = originalWidth
    canvas.height = originalHeight
    config.value = originalConfig
    await generatePosterCanvas()
    isExporting.value = false
  }
}

// 添加配置参数接口
interface GridConfig {
  columns: number // 列数
  gap: number // 间距像素值
  padding: number // 边距
  oddColumnOffset: number // 奇数列向上偏移量（像素）
  evenColumnOffset: number // 偶数列向上偏移量（像素）
}

interface CollageItem {
  src: string
  x: number
  y: number
  width: number
  height: number
  // 添加源图像裁剪参数
  sx?: number
  sy?: number
  sWidth?: number
  sHeight?: number
}

// 递归分割生成拼贴布局
function generateRandomCollageLayout(
  width: number, 
  height: number, 
  images: string[], 
  x = 0, 
  y = 0
): CollageItem[] {
  // 如果没有图片，返回空
  if (images.length === 0) return []

  // 如果只有一张图片，填满当前区域
  if (images.length === 1) {
    const src = images[0]
    const imgEl = document.getElementById(src) as HTMLImageElement
    if (!imgEl) return []

    const item: CollageItem = {
      src,
      x: x + width / 2, // 中心点 x
      y: y + height / 2, // 中心点 y
      width,
      height
    }

    // 计算裁切参数 (object-fit: cover)
    const targetRatio = width / height
    const sourceRatio = imgEl.naturalWidth / imgEl.naturalHeight
    
    if (targetRatio > sourceRatio) {
      // 目标更宽，裁切高度
      item.sWidth = imgEl.naturalWidth
      item.sHeight = imgEl.naturalWidth / targetRatio
      item.sx = 0
      item.sy = (imgEl.naturalHeight - item.sHeight) / 2
    } else {
      // 目标更高，裁切宽度
      item.sHeight = imgEl.naturalHeight
      item.sWidth = imgEl.naturalHeight * targetRatio
      item.sy = 0
      item.sx = (imgEl.naturalWidth - item.sWidth) / 2
    }

    return [item]
  }

  // 随机打乱图片顺序(只在顶层调用时打乱一次最好，但这里递归没法判断，所以我们在外部打乱)
  // 这里假设 images 已经被外部打乱了

  // 决定分割方向：优先分割长边，如果差不多则随机
  const isHorizontalSplit = width > height ? false : (height > width ? true : Math.random() > 0.5)
  // isHorizontalSplit = true 意味着上下分割(水平切割线)，false 意味着左右分割(垂直切割线)
  // 修正：width > height (宽长) -> 应该是左右分割 (Vertical Split)，即切割线是垂直的
  // 让我们统一术语：
  // splitVertical: 切割线垂直，左右两块。
  // splitHorizontal: 切割线水平，上下两块。
  
  const splitVertical = width > height * 1.2 
    ? true 
    : (height > width * 1.2 ? false : Math.random() > 0.5)

  // 随机分割比例 (0.3 - 0.7)
  const splitRatio = 0.3 + Math.random() * 0.4
  
  // 根据分割比例分配图片数量
  // 至少保留1张给较小的一边
  const count1 = Math.max(1, Math.round(images.length * splitRatio))
  const count2 = images.length - count1
  
  // 如果某一边分配为0（理论上上面逻辑已避免），强制分配
  if (count2 === 0) return generateRandomCollageLayout(width, height, images, x, y)

  const images1 = images.slice(0, count1)
  const images2 = images.slice(count1)

  if (splitVertical) {
    // 左右分割
    const w1 = width * splitRatio
    const w2 = width - w1
    return [
      ...generateRandomCollageLayout(w1, height, images1, x, y),
      ...generateRandomCollageLayout(w2, height, images2, x + w1, y)
    ]
  } else {
    // 上下分割
    const h1 = height * splitRatio
    const h2 = height - h1
    return [
      ...generateRandomCollageLayout(width, h1, images1, x, y),
      ...generateRandomCollageLayout(width, h2, images2, x, y + h1)
    ]
  }
}

// 计算交错网格布局
function generateStaggeredGridPoints(width: number, height: number, images: string[], cfg: GridConfig = config.value): Point[] {
  // 计算列宽
  const totalGapWidth = cfg.gap * (cfg.columns - 1)
  const usableWidth = width - cfg.padding * 2 - totalGapWidth
  const columnWidth = usableWidth / cfg.columns

  // 预计算所有图片的尺寸
  const imageInfos = images.map((image) => {
    const imgEl = document.getElementById(image) as HTMLImageElement
    if (!imgEl)
      return null

    const aspectRatio = imgEl.naturalWidth / imgEl.naturalHeight
    const drawWidth = columnWidth
    const drawHeight = drawWidth / aspectRatio

    return {
      width: drawWidth,
      height: drawHeight,
    }
  }).filter(Boolean)

  // 计算每列的图片高度总和（用于偶数列偏移）
  const columnImageHeights = Array.from({ length: cfg.columns }, () => 0)
  let col = 0
  imageInfos.forEach((info) => {
    if (!info)
      return
    columnImageHeights[col] = info.height
    col = (col + 1) % cfg.columns
  })

  // 初始化每列的当前高度（根据奇偶列设置不同的起始高度）
  const columnHeights = Array.from({ length: cfg.columns }, (_, index) => {
    // 偶数列偏移一个图片高度的50%，奇数列偏移固定像素
    const offset = index % 2 === 0
      ? columnImageHeights[index] * 0.5 // 偶数列偏移图片高度的50%
      : cfg.oddColumnOffset // 奇数列保持固定偏移
    return cfg.padding - offset
  })

  const points: Point[] = []

  // 按列顺序放置图片
  let currentColumn = 0
  imageInfos.forEach((info) => {
    if (!info)
      return

    // 计算图片位置
    const x = cfg.padding + currentColumn * (columnWidth + cfg.gap) + info.width / 2
    const y = columnHeights[currentColumn] + info.height / 2

    points.push({ x, y })

    // 更新列高度
    columnHeights[currentColumn] += info.height + cfg.gap

    // 移动到下一列
    currentColumn = (currentColumn + 1) % cfg.columns
  })

  return points
}

// 添加创建图片元素的辅助函数
function createImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // 添加跨域支持
    img.id = src
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function generatePosterCanvas(size?: { width: number, height: number }) {
  // if (!PLstore.userPermission) {
  //   highlightText()
  //   return
  // }
  const canvas = canvasRef.value
  if (!canvas)
    return

  canvas.width = size?.width || canvasWidth
  canvas.height = size?.height || canvasHeight

  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  if (!selectedPosters.value || selectedPosters.value.length === 0) return

  // 确保所有图片都已加载，并且支持跨域
  try {
    await Promise.all(selectedPosters.value.map(async (poster) => {
      let imgEl = document.getElementById(poster) as HTMLImageElement | null

      // 如果图片元素不存在或没有 crossOrigin 属性，重新创建
      if (!imgEl || !imgEl.crossOrigin) {
        imgEl = await createImageElement(poster)
        // 如果已存在旧的元素，替换它
        // const oldEl = document.getElementById(poster)
        // if (oldEl)
        //   oldEl.remove()
        const wrapper = document.createElement('div')
        wrapper.style.display = 'none'
        wrapper.appendChild(imgEl)
        document.body.appendChild(wrapper)
      }
    }))
  }
  catch (error) {
    console.error('Failed to load images:', error)
    return
  }

  if (isRandomMode.value) {
    // 随机打乱图片顺序
    const shuffled = [...selectedPosters.value].sort(() => Math.random() - 0.5)
    const items = generateRandomCollageLayout(canvas.width, canvas.height, shuffled)
    
    items.forEach((item) => {
      const imgEl = document.getElementById(item.src) as HTMLImageElement
      if (!imgEl)
        return

      if (item.sx !== undefined && item.sWidth !== undefined) {
        // 使用裁切绘制
        ctx.drawImage(
          imgEl,
          item.sx,
          item.sy!,
          item.sWidth,
          item.sHeight!,
          item.x - item.width / 2,
          item.y - item.height / 2,
          item.width,
          item.height,
        )
      }
      else {
        ctx.drawImage(
          imgEl,
          item.x - item.width / 2,
          item.y - item.height / 2,
          item.width,
          item.height,
        )
      }
    })
  }
  else {
    // 计算基础列宽
    const totalGapWidth = config.value.gap * (config.value.columns - 1)
    const usableWidth = canvas.width - config.value.padding * 2 - totalGapWidth
    const columnWidth = usableWidth / config.value.columns

    // 生成交错网格布局点位
    const points = generateStaggeredGridPoints(
      canvas.width,
      canvas.height,
      selectedPosters.value,
    )

    // 绘制图片
    selectedPosters.value.forEach((poster, index) => {
      const imgEl = document.getElementById(poster) as HTMLImageElement | null
      if (!imgEl || index >= points.length)
        return

      const point = points[index]
      const aspectRatio = imgEl.naturalWidth / imgEl.naturalHeight

      // 计算绘制尺寸（不再使用缩放）
      const drawWidth = columnWidth
      const drawHeight = drawWidth / aspectRatio

      // 居中绘制
      ctx.drawImage(
        imgEl,
        point.x - drawWidth / 2,
        point.y - drawHeight / 2,
        drawWidth,
        drawHeight,
      )
    })
  }
}

function handleChangeSelectedPoster(poster: string) {
  // 创建新的数组来触发响应式更新
  if (selectedPosters.value.includes(poster))
    selectedPosters.value = selectedPosters.value.filter(item => item !== poster)
  else
    selectedPosters.value = [...selectedPosters.value, poster]
}
</script>

<template>
  <Dialog 
    title="歌单海报生成" 
    :open="PLstore.isShowPoster" 
    class="w-[90vw] max-w-[1400px] h-[85vh]" 
    @visible-change="PLstore.isShowPoster = $event"
  >
    <div class="h-full flex flex-col gap-4">
        <!-- 顶部工具栏 -->
        <div class="flex items-center gap-3 shrink-0 p-1">
          <span class="text-lg">导出分辨率</span>
          <div class="flex gap-3">
            <div
              v-for="resolution in exportResolutions"
              :key="resolution"
              class="text-[14px] font-bold bg-[#1ed760] text-black px-3 py-1 rounded-full transition-colors flex items-center gap-2"
              :class="isExporting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[#1ed760]'"
              @click="handleExportResolution(resolution)"
            >
              <div v-if="isExporting" class="i-mingcute:loading-fill animate-spin text-sm" />
              {{ resolution }}
            </div>
            <div
              class="text-[14px] font-bold px-3 py-1 cursor-pointer rounded-full transition-colors ml-2"
              :class="isRandomMode ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-gray-600 text-white hover:bg-gray-700'"
              @click="isRandomMode = !isRandomMode"
            >
              {{ isRandomMode ? '随机拼贴' : '网格布局' }}
            </div>
          </div>
        </div>

        <!-- 内容区域 -->
        <div class="flex gap-6 flex-1 min-h-0">
          <!-- 左侧画布区域 -->
          <div class="flex-1 flex items-center justify-center bg-[#181818] rounded-lg p-4">
            <canvas
              ref="canvasRef"
              class="w-full h-full object-contain max-w-full max-h-full shadow-lg"
            />
          </div>

          <!-- 右侧预览列表 -->
          <div class="w-64 flex flex-col gap-4 shrink-0 max-h-[65vh]">
            <div class="text-lg font-bold text-white">
              海报预览
            </div>
            <div class="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-styled">
              <div
                v-for="poster in PLstore.posters"
                :key="poster"
                class="mb-3"
              >
                <div
                  class="relative hover:opacity-90 transition-opacity cursor-pointer group"
                  @click="handleChangeSelectedPoster(poster)"
                >
                  <img
                    :id="poster"
                    :src="poster"
                    crossorigin="anonymous"
                    class="w-full rounded-md transition-all duration-200"
                    :class="selectedPosters.includes(poster) ? 'ring-2 ring-[#1ed760]' : 'opacity-60 group-hover:opacity-100'"
                  >
                  <div v-if="selectedPosters.includes(poster)" class="absolute top-2 right-2 bg-[#1ed760] rounded-full p-0.5">
                    <div class="i-mingcute:check-line text-black text-sm"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  </Dialog>
</template>

