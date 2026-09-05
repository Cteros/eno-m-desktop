import { defineConfig } from 'unocss/vite'
import {
  presetAttributify,
  presetIcons,
  presetUno,
  transformerDirectives,
} from 'unocss'

export default defineConfig({
  presets: [presetUno(), presetAttributify(), presetIcons()],
  transformers: [transformerDirectives()],
  shortcuts: {
    btn: 'bg-white text-black font-700 px-5 py-2 h-10 rounded-full cursor-pointer hover:scale-104 transition-transform duration-120',
    'btn-primary': 'btn bg-$eno-primary hover:bg-$eno-primary-hover text-black h-10',
    'btn-secondary': 'px-4 py-2 rounded-full bg-[#282828] text-white font-700 transition-transform duration-120 hover:scale-104',
    'btn-ghost': 'px-4 py-2 rounded-full text-[#b3b3b3] font-700 transition-colors duration-120 hover:text-white hover:bg-white/10',

    'hov-item': 'hover:bg-$eno-fill-1 cursor-pointer rounded-md transition-colors duration-150',
    'has-border': 'border border-$eno-border',

    'card-base': 'relative rounded-lg bg-[#181818] transition-colors duration-150',
    'card-hover': 'hover:bg-[#282828]',
    'card-interactive': 'cursor-pointer',

    'text-display': 'text-4xl font-900 text-white tracking-tight',
    'text-heading-1': 'text-2xl font-800 text-white tracking-tight',
    'text-heading-2': 'text-xl font-700 text-white',
    'text-heading-3': 'text-lg font-700 text-white',
    'text-body': 'text-base font-normal text-[#b3b3b3]',
    'text-body-small': 'text-sm font-normal text-[#a7a7a7]',
    'text-body-tiny': 'text-xs font-normal text-[#808080]',

    'page-container': 'w-full h-full overflow-auto bg-[#121212]',
    'page-inner': 'w-full h-full overflow-auto pb-8 px-8 pt-6 bg-[#121212]',
    'sp-page': 'w-full h-full overflow-auto pb-8 px-8 pt-4',

    'flex-center': 'flex items-center justify-center',
    'absolute-cover': 'absolute inset-0',
    'group-hover-scale': 'group-hover:scale-110 transition-transform duration-300',
    'truncate-2': 'line-clamp-2',
    'pointer-none': 'pointer-events-none',
  },
})
